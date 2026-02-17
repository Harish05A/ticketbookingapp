
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
  AlertTriangle,
  Clapperboard
} from 'lucide-react';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db } from './services/firebase';
import { Movie, Show, Booking, Theater, User } from './types';
import MovieDetail from './components/MovieDetail';
import AdminDashboard from './components/AdminDashboard';
import BookingSuccess from './components/BookingSuccess';
import AuthPage from './components/AuthPage';
import { apiClient } from './services/api';

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
        setMovies(movieData);
        setShows(showData);
        setTheaters(theaterData);
      } catch (err) {
        console.error("Critical Data Fetch Error", err);
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
    await apiClient.logout();
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
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-1">{currentUser.is_staff ? 'Administrator' : 'Cinema Enthusiast'}</p>
                    </div>
                    <button onClick={handleLogout} className="p-2 bg-slate-800 rounded-full text-slate-300 hover:text-rose-500 transition-colors">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <Link to="/auth" className="flex items-center gap-2 px-4 py-2 bg-rose-600 rounded-lg font-bold hover:bg-rose-500 transition-colors shadow-lg shadow-rose-600/20">
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
            {currentUser?.is_staff && <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block text-rose-500">Admin Panel</Link>}
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
      {/* Hero Header */}
      <div className="relative rounded-[2.5rem] overflow-hidden mb-12 h-[350px] md:h-[500px] border border-slate-800/50 shadow-2xl">
        <img src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover grayscale opacity-40" alt="Cinema" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-8 md:p-16">
          <div className="inline-flex items-center gap-2 bg-rose-600/10 border border-rose-500/20 text-rose-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 w-fit">
            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" /> Live Bookings Active
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter uppercase leading-none">Your Private Cinema<br/>Awaits.</h1>
          <p className="text-slate-400 max-w-xl text-lg opacity-80 leading-relaxed">Book premium theater experiences across India. Real-time seat tracking enabled with secure payment gateway integration.</p>
        </div>
      </div>

      <div className="relative mb-16">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Search for movies, theaters, or genres..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900/50 border border-slate-800 rounded-3xl py-6 pl-14 pr-6 text-white text-lg focus:ring-2 focus:ring-rose-500 transition-all outline-none shadow-2xl backdrop-blur-sm"
        />
      </div>

      <div className="flex items-center justify-between mb-10">
        <h2 className="text-3xl font-black flex items-center gap-3 uppercase tracking-tighter">
          <Clapperboard className="text-rose-500 w-8 h-8" /> Now Showing
        </h2>
        <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{filteredMovies.length} MOVIES AVAILABLE</div>
      </div>

      {filteredMovies.length === 0 ? (
        <div className="text-center py-24 bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-800">
          <Film className="w-20 h-20 text-slate-800 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-slate-300 mb-2">The box office is currently quiet.</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-8">No movies are currently scheduled in your area. Check back later or login as admin to schedule the season's hits.</p>
          <Link to="/auth" className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-2xl font-bold transition-all">
            Administrative Access <LogIn className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10">
          {filteredMovies.map(movie => (
            <Link key={movie.id} to={`/movie/${movie.id}`} className="group block">
              <div className="relative aspect-[2/3] rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 group-hover:scale-[1.03] group-hover:-translate-y-3 group-hover:shadow-rose-500/10">
                <img src={movie.poster} className="w-full h-full object-cover" alt={movie.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-6 left-6 right-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <button className="w-full bg-white text-slate-950 font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest shadow-xl">Get Tickets</button>
                </div>
              </div>
              <div className="mt-6 px-2">
                <h3 className="font-black text-slate-100 group-hover:text-rose-500 transition-colors line-clamp-1 uppercase tracking-tight text-lg leading-tight">{movie.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-rose-500 text-[9px] font-black uppercase tracking-widest border border-rose-500/30 px-2 py-0.5 rounded-md">{movie.genre[0]}</span>
                  <span className="text-slate-600 text-[9px] font-black uppercase tracking-widest">• {movie.duration}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const BookingHistory: React.FC<{ bookings: Booking[] }> = ({ bookings }) => (
  <div className="max-w-4xl mx-auto px-4 py-16">
    <h2 className="text-4xl font-black mb-10 flex items-center gap-4 uppercase tracking-tighter">
      <Ticket className="w-10 h-10 text-rose-500" /> Ticket Wallet
    </h2>
    {bookings.length === 0 ? (
      <div className="text-center py-24 bg-slate-900/50 rounded-[3rem] border border-slate-800 shadow-2xl">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <Ticket className="w-10 h-10 text-slate-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-200 mb-2">No active bookings</h3>
        <p className="text-slate-500 mb-8">Your ticket history is currently empty.</p>
        <Link to="/" className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-500 transition-all">Explore Movies</Link>
      </div>
    ) : (
      <div className="space-y-6">
        {bookings.map(b => (
          <div key={b.id} className="bg-slate-900/80 backdrop-blur-sm p-8 rounded-[2rem] border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl hover:border-slate-700 transition-colors">
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center shrink-0">
                  <Film className="w-8 h-8 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-1">{b.movieTitle}</h3>
                  <p className="text-slate-500 text-sm font-medium">{b.theaterName} • <span className="text-rose-500">{b.time}</span></p>
                  <div className="flex gap-2 mt-3">
                    {b.seats.map(s => <span key={s} className="bg-slate-800/50 px-3 py-1 rounded-lg text-[10px] text-slate-300 font-black uppercase tracking-widest">{s}</span>)}
                  </div>
                </div>
             </div>
             <div className="text-center md:text-right shrink-0">
               <span className="text-emerald-500 text-[10px] font-black uppercase bg-emerald-500/10 px-4 py-1.5 rounded-full tracking-widest border border-emerald-500/20">Payment Verified</span>
               <p className="text-2xl font-black text-white mt-4 tracking-tighter">₹{b.amount}</p>
               <p className="text-[10px] text-slate-600 font-bold uppercase mt-1 tracking-widest">Digital Invoice ID: {b.id.slice(-6)}</p>
             </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default App;
