
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { db, auth } from './firebase';
import { Movie, Theater, Show, Booking, BookingStatus } from '../types';
import { INITIAL_MOVIES, INITIAL_SHOWS, INITIAL_THEATERS, generateSeats } from '../constants';

const ADMIN_SECRET = "CINEQUEST_MASTER_2025";

export const apiClient = {
  login: async (credentials: any) => {
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
  },

  register: async (userData: any) => {
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const firebaseUser = userCredential.user;
    
    // Check if registering as master admin
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
  },

  logout: async () => {
    await signOut(auth);
  },

  getMovies: async (): Promise<Movie[]> => {
    try {
      const snap = await getDocs(collection(db, "movies"));
      if (snap.empty) return INITIAL_MOVIES;
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Movie));
    } catch (e) {
      return INITIAL_MOVIES;
    }
  },

  addMovie: async (movieData: any) => {
    const docRef = await addDoc(collection(db, "movies"), movieData);
    return { id: docRef.id, ...movieData };
  },

  getTheaters: async (): Promise<Theater[]> => {
    try {
      const snap = await getDocs(collection(db, "theaters"));
      if (snap.empty) return INITIAL_THEATERS;
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Theater));
    } catch (e) {
      return INITIAL_THEATERS;
    }
  },

  getShows: async (movieId?: string): Promise<Show[]> => {
    try {
      const snap = await getDocs(collection(db, "shows"));
      let shows = snap.docs.map(d => ({ id: d.id, ...d.data() } as Show));
      if (snap.empty) {
         for(const s of INITIAL_SHOWS) {
            await setDoc(doc(db, "shows", s.id), s);
         }
         shows = INITIAL_SHOWS;
      }
      if (movieId) return shows.filter(s => s.movieId === movieId);
      return shows;
    } catch (e) {
      return INITIAL_SHOWS;
    }
  },

  addShow: async (showData: any) => {
    const data = { ...showData, seats: generateSeats() };
    const docRef = await addDoc(collection(db, "shows"), data);
    return { id: docRef.id, ...data };
  },

  createBooking: async (bookingData: any) => {
    const docRef = await addDoc(collection(db, "bookings"), {
      ...bookingData,
      status: BookingStatus.CONFIRMED,
      timestamp: Date.now()
    });

    const showRef = doc(db, "shows", bookingData.showId);
    const showSnap = await getDoc(showRef);
    if (showSnap.exists()) {
      const currentSeats = showSnap.data().seats;
      const bookedSeats = bookingData.seats.split(',');
      const updatedSeats = { ...currentSeats };
      bookedSeats.forEach((s: string) => {
        updatedSeats[s] = 'booked';
      });
      await updateDoc(showRef, { seats: updatedSeats });
    }

    return { 
      booking: { 
        id: docRef.id, 
        ...bookingData, 
        status: BookingStatus.CONFIRMED 
      } 
    };
  },

  createTheaterAdmin: async (adminData: any) => {
    const theaterRef = await addDoc(collection(db, "theaters"), {
      name: adminData.theaterName,
      city: adminData.city,
      screens: Array.from({length: adminData.screens || 1}, (_, i) => `Screen ${i+1}`)
    });
    await addDoc(collection(db, "pending_admins"), {
      username: adminData.username,
      theaterId: theaterRef.id,
      theaterName: adminData.theaterName
    });
    return { success: true };
  },

  getAnalytics: async () => {
    try {
      const snap = await getDocs(collection(db, "bookings"));
      const bookings = snap.docs.map(d => d.data());
      const totalRev = bookings.reduce((acc, b) => acc + (b.amount || 0), 0);
      return {
        total_revenue: totalRev || 0,
        total_bookings: bookings.length || 0,
        movie_popularity: [
          { name: 'Pathaan', bookings: 35 },
          { name: 'Jawan', bookings: 40 },
          { name: 'Animal', bookings: 9 }
        ]
      };
    } catch (e) {
      return { total_revenue: 0, total_bookings: 0, movie_popularity: [] };
    }
  }
};
