
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { 
  Film, 
  LayoutDashboard, 
  Ticket, 
  Search,
  Menu,
  X,
  LogOut,
  LogIn,
  AlertTriangle
} from 'lucide-react';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db } from './services/firebase';
import { Movie, Show, Booking, Theater, User } from './types';
import MovieDetail from './components/MovieDetail';
import AdminDashboard from './components/AdminDashboard';
import BookingSuccess from './components/BookingSuccess';
import AuthPage from './components/AuthPage';
import { apiClient } from './services/api';
import { INITIAL_MOVIES, INITIAL_SHOWS, INITIAL_THEATERS } from './constants';

const App: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUser: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Listen to real-time user document changes for fines
        unsubscribeUser = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const combinedUser: User = { 
              id: firebaseUser.uid, 
              username: userData.username || firebaseUser.displayName || firebaseUser.email?.split('@')[0], 
              email: firebaseUser.email || '', 
              is_staff: userData.is_staff || false,
              is_superuser: userData.is_superuser || false,
              fines: userData.fines || 0,
              managedTheater: userData.managedTheater || null
            };
            setCurrentUser(combinedUser);
            localStorage.setItem('cinequest_user', JSON.stringify(combinedUser));
          }
        });
      } else {
        setCurrentUser(null);
        localStorage.removeItem('cinequest_user');
      }
      setIsLoading(false);
    });

    const fetchData = async () => {
      try {
        const [movieData, showData, theaterData] = await Promise.all([
          apiClient.getMovies(),
          apiClient.getShows(),
          apiClient.getTheaters()
        ]);
        setMovies(movieData || INITIAL_MOVIES);
        setShows(showData || INITIAL_SHOWS);
        setTheaters(theaterData || INITIAL_THEATERS);
      } catch (err) {
        console.error("Error fetching initial data", err);
        setMovies(INITIAL_MOVIES);
        setShows(INITIAL_SHOWS);
        setTheaters(INITIAL_THEATERS);
      }
    };
    fetchData();

    return () => {
      unsubscribeAuth();
      unsubscribeUser();
    };
  }, []);

  const handleLogin = (userData: any, token: string) => {
    localStorage.setItem('cinequest_token', token);
    localStorage.setItem('cinequest_user', JSON.stringify(userData));
    setCurrentUser(userData);
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch (err) {
      console.error("Logout error", err);
    }
    setCurrentUser(null);
    window.location.hash = '#/';
  };

  const addBookingLocally = (booking: Booking) => {
    setBookings(prev => [booking, ...prev]);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-2 text-rose-500 font-bold text-xl">
                <Film className="w-8 h-8" />
                <span className="tracking-tighter">CINEQUEST</span>
              </Link>

              <div className="hidden md:flex items-center gap-8">
                <Link to="/" className="text-slate-300 hover:text-white transition-colors">Movies</Link>
                {currentUser && <Link to="/bookings" className="text-slate-300 hover:text-white transition-colors">My Tickets</Link>}
                
                {currentUser?.is_staff && (
                  <Link to="/admin" className="text-rose-500 hover:text-rose-400 font-medium flex items-center gap-1">
                    <LayoutDashboard className="w-4 h-4" />
                    Admin
                  </Link>
                )}

                {currentUser ? (
                  <div className="flex items-center gap-4 pl-4 border-l border-slate-700">
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {currentUser.fines > 0 && (
                          <span className="flex items-center gap-1 bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                            <AlertTriangle className="w-3 h-3" /> ₹{currentUser.fines} Fine
                          </span>
                        )}
                        <p className="text-sm font-bold text-white leading-none">{currentUser.username}</p>
                      </div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{currentUser.is_staff ? 'Administrator' : 'Movie Buff'}</p>
                    </div>
                    <button onClick={handleLogout} className="p-2 bg-slate-800 rounded-full text-slate-300 hover:text-rose-500 transition-colors">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <Link to="/auth" className="flex items-center gap-2 px-4 py-2 bg-rose-600 rounded-lg font-bold hover:bg-rose-500 transition-colors">
                    <LogIn className="w-4 h-4" /> Login
                  </Link>
                )}
              </div>

              <div className="md:hidden">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-400">
                  {isMenuOpen ? <X /> : <Menu />}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {isMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-4">
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="block text-slate-300">Movies</Link>
            {currentUser && <Link to="/bookings" onClick={() => setIsMenuOpen(false)} className="block text-slate-300">My Tickets</Link>}
            {currentUser?.is_staff && <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block text-rose-500">Admin</Link>}
            {!currentUser && <Link to="/auth" onClick={() => setIsMenuOpen(false)} className="block text-rose-500">Login</Link>}
          </div>
        )}

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home movies={movies} />} />
            <Route path="/auth" element={<AuthPage onLogin={handleLogin} />} />
            <Route path="/movie/:id" element={<MovieDetail movies={movies} shows={shows} theaters={theaters} onBooking={addBookingLocally} currentUser={currentUser} />} />
            <Route path="/bookings" element={currentUser ? <BookingHistory bookings={bookings} /> : <Navigate to="/auth" />} />
            <Route path="/booking-success/:id" element={<BookingSuccess bookings={bookings} />} />
            <Route path="/admin" element={currentUser?.is_staff ? <AdminDashboard movies={movies} bookings={bookings} shows={shows} /> : <Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

const Home: React.FC<{ movies: Movie[] }> = ({ movies }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredMovies = movies.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="relative rounded-[2rem] overflow-hidden mb-12 h-[300px] md:h-[450px]">
        <img src="https://picsum.photos/seed/cine/1200/500" className="w-full h-full object-cover" alt="Hero" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent flex flex-col justify-end p-8 md:p-12">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter uppercase">Cinematic Excellence</h1>
          <p className="text-slate-200 max-w-xl text-lg hidden md:block opacity-80">The best movies in your city, now just a tap away. Exclusive pre-bookings open via Firebase Secure App.</p>
        </div>
      </div>

      <div className="relative mb-12">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Search by title, genre, or cast..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-rose-500 transition-all outline-none shadow-xl"
        />
      </div>

      <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">Now Showing</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
        {filteredMovies.map(movie => (
          <Link key={movie.id} to={`/movie/${movie.id}`} className="group block">
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 group-hover:scale-[1.02] group-hover:-translate-y-2">
              <img src={movie.poster} className="w-full h-full object-cover" alt={movie.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60" />
              <div className="absolute bottom-4 left-4 right-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <button className="w-full bg-rose-600 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-widest">Book Now</button>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="font-bold text-slate-100 group-hover:text-rose-500 transition-colors line-clamp-1">{movie.title}</h3>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{movie.genre.join(', ')}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const BookingHistory: React.FC<{ bookings: Booking[] }> = ({ bookings }) => (
  <div className="max-w-4xl mx-auto px-4 py-12">
    <h2 className="text-3xl font-black mb-8 flex items-center gap-3 uppercase tracking-tighter">My Tickets</h2>
    {bookings.length === 0 ? (
      <div className="text-center py-20 bg-slate-900 rounded-3xl border border-slate-800">
        <Ticket className="w-16 h-16 text-slate-700 mx-auto mb-4" />
        <p className="text-slate-400">No active bookings found.</p>
        <Link to="/" className="mt-4 inline-block text-rose-500 font-bold">Find a movie</Link>
      </div>
    ) : (
      <div className="space-y-6">
        {bookings.map(b => (
          <div key={b.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex justify-between items-center">
             <div>
               <h3 className="text-xl font-bold">{b.movieTitle}</h3>
               <p className="text-slate-500 text-sm">{b.theaterName} • {b.time}</p>
               <div className="flex gap-2 mt-2">
                 {b.seats.map(s => <span key={s} className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-400 font-bold">{s}</span>)}
               </div>
             </div>
             <div className="text-right">
               <span className="text-green-500 text-[10px] font-black uppercase bg-green-500/10 px-3 py-1 rounded-full">Confirmed</span>
               <p className="text-white font-bold mt-2">₹{b.amount}</p>
             </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default App;
