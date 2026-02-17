
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  addDoc, 
  runTransaction,
  increment,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  getAuth
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { db, auth, firebaseConfig } from './firebase';
import { Movie, Theater, Show, Booking, BookingStatus, SeatState, User } from '../types';
import { generateSeats } from '../constants';

const ADMIN_SECRET = "CINEQUEST_MASTER_2025";
const SEAT_HOLD_DURATION_MS = 5 * 60 * 1000;
const ABANDON_FINE_AMOUNT = 5;
const DJANGO_API_BASE = "/api";

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
          fines: userData.fines || 0,
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
        fines: 0,
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

  getMovies: async (): Promise<Movie[]> => {
    return withRetry(async () => {
      const snap = await getDocs(collection(db, "movies"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Movie));
    });
  },

  getShows: async (movieId?: string): Promise<Show[]> => {
    return withRetry(async () => {
      // Fix: un-commented and corrected query logic for movieId filtering
      let q = collection(db, "shows") as any;
      if (movieId) {
        q = query(collection(db, "shows"), where("movieId", "==", movieId));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Show));
    });
  },

  getTheaters: async (): Promise<Theater[]> => {
    return withRetry(async () => {
      const snap = await getDocs(collection(db, "theaters"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Theater));
    });
  },

  cleanupExpiredHolds: async (showId: string) => {
    const showRef = doc(db, "shows", showId);
    return await runTransaction(db, async (transaction) => {
      const showDoc = await transaction.get(showRef);
      if (!showDoc.exists()) return false;
      const seats = showDoc.data().seats as Record<string, SeatState>;
      const now = Date.now();
      let hasChanges = false;
      const updatedSeats = { ...seats };
      const usersToFine: Set<string> = new Set();

      Object.entries(seats).forEach(([id, seat]) => {
        if (typeof seat === 'object' && seat.status === 'held' && seat.expiresAt < now) {
          if (seat.heldBy) usersToFine.add(seat.heldBy);
          updatedSeats[id] = 'available';
          hasChanges = true;
        }
      });

      if (hasChanges) {
        transaction.update(showRef, { seats: updatedSeats });
        for (const uId of usersToFine) {
          const userRef = doc(db, "users", uId);
          transaction.update(userRef, { fines: increment(ABANDON_FINE_AMOUNT) });
        }
      }
      return hasChanges;
    });
  },

  holdSeats: async (showId: string, seatIds: string[], userId: string) => {
    const showRef = doc(db, "shows", showId);
    return await runTransaction(db, async (transaction) => {
      const showDoc = await transaction.get(showRef);
      if (!showDoc.exists()) throw new Error("Show not found.");
      
      const userRef = doc(db, "users", userId);
      const userDoc = await transaction.get(userRef);
      if (userDoc.exists() && (userDoc.data().fines || 0) > 50) {
        throw new Error("Outstanding fines limit reached. Please pay your ₹" + userDoc.data().fines + " balance first.");
      }

      const seats = showDoc.data().seats as Record<string, SeatState>;
      const now = Date.now();
      
      for (const id of seatIds) {
        const seat = seats[id];
        if (seat === 'booked') throw new Error(`Seat ${id} was just booked.`);
        if (typeof seat === 'object' && seat.status === 'held') {
          if (seat.heldBy !== userId && seat.expiresAt > now) throw new Error(`Seat ${id} is currently held.`);
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

  createBooking: async (bookingData: any) => {
    const token = await auth.currentUser?.getIdToken();
    const showRef = doc(db, "shows", bookingData.showId);
    const requestedSeats = bookingData.seats.split(',');

    // 1. Transactional check and Firestore update (for real-time consistency)
    await runTransaction(db, async (transaction) => {
      const showDoc = await transaction.get(showRef);
      if (!showDoc.exists()) throw new Error("Show not found.");
      const currentSeats = showDoc.data().seats as Record<string, SeatState>;
      
      requestedSeats.forEach((seatId: string) => {
        const seat = currentSeats[seatId];
        if (seat === 'booked') throw new Error(`Seat ${seatId} just sold out.`);
      });

      const updatedSeats = { ...currentSeats };
      requestedSeats.forEach((s: string) => { updatedSeats[s] = 'booked'; });
      transaction.update(showRef, { seats: updatedSeats });
    });

    // 2. Django / Razorpay Bridge
    const response = await fetch(`${DJANGO_API_BASE}/bookings/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify(bookingData)
    });

    if (!response.ok) {
       // Rollback in Firestore if backend fails (Simplified)
       throw new Error("Payment gateway connection failed.");
    }

    const result = await response.json();
    return { booking: result.booking, payment: result.payment_order };
  },

  addMovie: async (movieData: any) => {
    const docRef = await addDoc(collection(db, "movies"), movieData);
    return { id: docRef.id, ...movieData };
  },

  addShow: async (showData: { movieId: string, theaterId: string, time: string, price: number }) => {
    const theaterDoc = await getDoc(doc(db, "theaters", showData.theaterId));
    if (!theaterDoc.exists()) throw new Error("Theater not found.");
    
    const tData = theaterDoc.data() as Theater;
    const layout = tData.layout || { rows: ['A', 'B', 'C', 'D', 'E'], cols: 10 };

    const docRef = await addDoc(collection(db, "shows"), {
      ...showData,
      seats: generateSeats(layout.rows, layout.cols),
      theater_name: tData.name
    });
    return { id: docRef.id, ...showData };
  },

  // Fix: added missing createTheaterAdmin method to support AdminDashboard functionality
  createTheaterAdmin: async (adminData: any) => {
    return withRetry(async () => {
      // 1. Create the theater resource
      const theaterRef = await addDoc(collection(db, "theaters"), {
        name: adminData.theaterName,
        city: adminData.city,
        screens: Array.from({ length: adminData.screens || 1 }, (_, i) => `Screen ${i + 1}`),
        layout: adminData.layout
      });

      // 2. Create entry in pending_admins to trigger the background user provisioning function
      await addDoc(collection(db, "pending_admins"), {
        username: adminData.username,
        email: adminData.email,
        password: adminData.password,
        theaterId: theaterRef.id,
        theaterName: adminData.theaterName,
        createdAt: Date.now()
      });

      return { theaterId: theaterRef.id };
    });
  },

  getAnalytics: async () => {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(`${DJANGO_API_BASE}/admin/analytics/`, {
       headers: { 'Authorization': `Token ${token}` }
    });
    if (!response.ok) return { total_revenue: 0, total_bookings: 0, movie_popularity: [] };
    return await response.json();
  }
};
