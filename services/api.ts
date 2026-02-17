
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  addDoc, 
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  getAuth
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { db, auth, firebaseConfig } from './firebase';
import { Movie, Theater, Show, Booking, BookingStatus, SeatState } from '../types';
import { INITIAL_MOVIES, INITIAL_SHOWS, INITIAL_THEATERS, generateSeats } from '../constants';

const ADMIN_SECRET = "CINEQUEST_MASTER_2025";
const SEAT_HOLD_DURATION_MS = 5 * 60 * 1000;

// Base API URL for Django Backend
const API_BASE = window.location.origin + '/api';

const secondaryApp = initializeApp(firebaseConfig, "SecondaryAuthHandler");
const secondaryAuth = getAuth(secondaryApp);

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) throw error;
    if (error.code?.startsWith('auth/')) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

export const apiClient = {
  // Authentication via Firebase Auth
  login: async (credentials: any) => {
    return withRetry(async () => {
      const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      const firebaseUser = userCredential.user;
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      return { 
        token: await firebaseUser.getIdToken(), 
        user: { 
          id: firebaseUser.uid, 
          username: userData.username || firebaseUser.displayName || firebaseUser.email?.split('@')[0], 
          email: firebaseUser.email, 
          is_staff: userData.is_staff || false, 
          is_superuser: userData.is_superuser || false,
          managedTheater: userData.managedTheater || null
        } 
      };
    });
  },

  register: async (userData: any) => {
    return withRetry(async () => {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const firebaseUser = userCredential.user;
      const isMaster = userData.adminKey === ADMIN_SECRET;
      const newUserMetadata = {
        username: userData.username,
        email: userData.email,
        is_staff: isMaster,
        is_superuser: isMaster,
        createdAt: Date.now()
      };
      await setDoc(doc(db, "users", firebaseUser.uid), newUserMetadata);
      return { 
        token: await firebaseUser.getIdToken(), 
        user: { id: firebaseUser.uid, ...newUserMetadata } 
      };
    });
  },

  logout: async () => {
    await signOut(auth);
  },

  // Real-time Content via Firestore
  getMovies: async (): Promise<Movie[]> => {
    return withRetry(async () => {
      const snap = await getDocs(collection(db, "movies"));
      if (snap.empty) return INITIAL_MOVIES;
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Movie));
    });
  },

  getShows: async (): Promise<Show[]> => {
    return withRetry(async () => {
      const snap = await getDocs(collection(db, "shows"));
      if (snap.empty) return INITIAL_SHOWS;
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Show));
    });
  },

  getTheaters: async (): Promise<Theater[]> => {
    return withRetry(async () => {
      const snap = await getDocs(collection(db, "theaters"));
      if (snap.empty) {
         for(const t of INITIAL_THEATERS) {
            await setDoc(doc(db, "theaters", t.id), t);
         }
         return INITIAL_THEATERS;
      }
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Theater));
    });
  },

  // Content Management
  addMovie: async (movieData: any) => {
    const docRef = await addDoc(collection(db, "movies"), movieData);
    return { id: docRef.id, ...movieData };
  },

  addShow: async (showData: { movieId: string, theaterId: string, time: string, price: number }) => {
    const theaterDoc = await getDoc(doc(db, "theaters", showData.theaterId));
    let layout = { rows: ['A', 'B', 'C', 'D', 'E'], cols: 5 };
    
    if (theaterDoc.exists()) {
      const tData = theaterDoc.data() as Theater;
      if (tData.layout) layout = tData.layout;
    }

    const docRef = await addDoc(collection(db, "shows"), {
      ...showData,
      seats: generateSeats(layout.rows, layout.cols),
      theater_name: theaterDoc.exists() ? (theaterDoc.data() as Theater).name : 'Cinema'
    });
    return { id: docRef.id, ...showData };
  },

  // Real-time Seat Locking (Crucial Business Logic)
  cleanupExpiredHolds: async (showId: string) => {
    const showRef = doc(db, "shows", showId);
    return await runTransaction(db, async (transaction) => {
      const showDoc = await transaction.get(showRef);
      if (!showDoc.exists()) return false;
      const seats = showDoc.data().seats as Record<string, SeatState>;
      const now = Date.now();
      let hasChanges = false;
      const updatedSeats = { ...seats };
      Object.entries(seats).forEach(([id, seat]) => {
        if (typeof seat === 'object' && seat.status === 'held' && seat.expiresAt < now) {
          updatedSeats[id] = 'available';
          hasChanges = true;
        }
      });
      if (hasChanges) transaction.update(showRef, { seats: updatedSeats });
      return hasChanges;
    });
  },

  holdSeats: async (showId: string, seatIds: string[], userId: string) => {
    const showRef = doc(db, "shows", showId);
    return await runTransaction(db, async (transaction) => {
      const showDoc = await transaction.get(showRef);
      if (!showDoc.exists()) throw new Error("Show not found.");
      const seats = showDoc.data().seats as Record<string, SeatState>;
      const now = Date.now();
      for (const id of seatIds) {
        const seat = seats[id];
        if (seat === 'booked') throw new Error(`Seat ${id} was just booked.`);
        if (typeof seat === 'object' && seat.status === 'held') {
          if (seat.heldBy !== userId && seat.expiresAt > now) throw new Error(`Seat ${id} is currently held by someone else.`);
        }
      }
      const updatedSeats = { ...seats };
      const expiresAt = now + SEAT_HOLD_DURATION_MS;
      seatIds.forEach(id => {
        updatedSeats[id] = { status: 'held', heldBy: userId, expiresAt };
      });
      transaction.update(showRef, { seats: updatedSeats });
      return { expiresAt };
    });
  },

  releaseSeats: async (showId: string, seatIds: string[], userId: string) => {
    const showRef = doc(db, "shows", showId);
    return await runTransaction(db, async (transaction) => {
      const showDoc = await transaction.get(showRef);
      if (!showDoc.exists()) return;
      const seats = showDoc.data().seats as Record<string, SeatState>;
      const updatedSeats = { ...seats };
      let hasChanges = false;
      seatIds.forEach(id => {
        const seat = seats[id];
        if (typeof seat === 'object' && seat.status === 'held' && seat.heldBy === userId) {
          updatedSeats[id] = 'available';
          hasChanges = true;
        }
      });
      if (hasChanges) transaction.update(showRef, { seats: updatedSeats });
    });
  },

  // Final Booking Logic
  createBooking: async (bookingData: any) => {
    const showRef = doc(db, "shows", bookingData.showId);
    const bookingsCol = collection(db, "bookings");
    const requestedSeats = bookingData.seats.split(',');
    
    return await runTransaction(db, async (transaction) => {
      const showDoc = await transaction.get(showRef);
      if (!showDoc.exists()) throw new Error("Show not found.");
      const currentSeats = showDoc.data().seats as Record<string, SeatState>;
      const now = Date.now();
      
      for (const seatId of requestedSeats) {
        const seat = currentSeats[seatId];
        if (seat === 'booked') throw new Error(`Seat ${seatId} was just booked.`);
        if (typeof seat === 'object' && seat.status === 'held' && seat.heldBy !== bookingData.userId && seat.expiresAt > now) throw new Error(`Seat ${seatId} is no longer reserved.`);
      }

      const updatedSeats = { ...currentSeats };
      requestedSeats.forEach((seat: string) => { updatedSeats[seat] = 'booked'; });
      
      const newBookingRef = doc(bookingsCol);
      const bookingRecord = {
        ...bookingData,
        status: BookingStatus.CONFIRMED,
        timestamp: now,
        id: newBookingRef.id,
      };

      transaction.update(showRef, { seats: updatedSeats });
      transaction.set(newBookingRef, bookingRecord);
      return { booking: bookingRecord };
    });
  },

  createTheaterAdmin: async (adminData: any) => {
    const theaterRef = await addDoc(collection(db, "theaters"), {
      name: adminData.theaterName,
      city: adminData.city,
      screens: Array.from({length: adminData.screens || 1}, (_, i) => `Screen ${i+1}`),
      layout: adminData.layout || { rows: ['A', 'B', 'C', 'D', 'E'], cols: 10 }
    });

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, adminData.email, adminData.password);
      const newStaffId = userCredential.user.uid;

      await setDoc(doc(db, "users", newStaffId), {
        username: adminData.username,
        email: adminData.email,
        is_staff: true,
        is_superuser: false,
        managedTheater: {
          id: theaterRef.id,
          name: adminData.theaterName
        },
        createdAt: Date.now()
      });

      await signOut(secondaryAuth);
      return { success: true, theaterId: theaterRef.id };
    } catch (error: any) {
      throw new Error(error.message || "Admin provisioning failed.");
    }
  },

  getAnalytics: async () => {
    return withRetry(async () => {
      const snap = await getDocs(collection(db, "bookings"));
      const bookings = snap.docs.map(d => d.data());
      const totalRev = bookings.reduce((acc, b) => acc + (b.amount || 0), 0);
      return {
        total_revenue: totalRev || 0,
        total_bookings: bookings.length || 0,
        movie_popularity: []
      };
    });
  }
};
