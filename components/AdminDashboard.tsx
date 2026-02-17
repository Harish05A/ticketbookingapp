
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, TrendingUp, DollarSign, Plus, MapPin, Activity, Film, X, Clock, Building2, RefreshCw, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Movie, Booking, Show, Theater } from '../types';
import { apiClient } from '../services/api';

interface AdminDashboardProps {
  movies: Movie[];
  bookings: Booking[];
  shows: Show[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ movies: initialMovies }) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'movies' | 'theaters' | 'maintenance'>('analytics');
  const [analytics, setAnalytics] = useState<any>(null);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [currentMovies, setCurrentMovies] = useState<Movie[]>(initialMovies);
  
  const [isAddingMovie, setIsAddingMovie] = useState(false);
  const [isAddingShow, setIsAddingShow] = useState(false);
  const [isAddingTheater, setIsAddingTheater] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [newMovie, setNewMovie] = useState({
    title: '', poster: '', genre: '', duration: '', description: '', releaseDate: new Date().toISOString().split('T')[0], rating: 4.5
  });

  const [newShow, setNewShow] = useState({
    movieId: '', theaterId: '', time: '10:00 AM', price: 250
  });

  const [newTheaterAdmin, setNewTheaterAdmin] = useState({
    username: '', email: '', password: '', theaterName: '', city: '', screens: 1,
    rows: 8, cols: 10
  });

  const fetchData = useCallback(async () => {
    try {
      const [analyticData, theaterData, movieData] = await Promise.all([
        apiClient.getAnalytics(),
        apiClient.getTheaters(),
        apiClient.getMovies()
      ]);
      setAnalytics(analyticData);
      setTheaters(theaterData);
      setCurrentMovies(movieData);
    } catch (err) {
      console.error("Fetch error", err);
    }
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem('cinequest_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      if (!user.is_superuser && user.managedTheater) {
        setNewShow(prev => ({ ...prev, theaterId: user.managedTheater.id }));
      }
    }
    fetchData();
  }, [fetchData]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.addMovie({
        ...newMovie,
        genre: newMovie.genre.split(',').map(g => g.trim())
      });
      await fetchData();
      setIsAddingMovie(false);
      showNotification('success', 'Movie added to catalog.');
      setNewMovie({ title: '', poster: '', genre: '', duration: '', description: '', releaseDate: new Date().toISOString().split('T')[0], rating: 4.5 });
    } catch (err) { 
      showNotification('error', 'Failed to add movie.'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleAddShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShow.movieId || !newShow.theaterId) {
      showNotification('error', 'Please select both a movie and a theater.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.addShow({
        movieId: newShow.movieId,
        theaterId: newShow.theaterId,
        time: newShow.time,
        price: Number(newShow.price)
      });
      await fetchData();
      setIsAddingShow(false);
      showNotification('success', 'Showtime scheduled.');
    } catch (err) { 
      showNotification('error', 'Failed to schedule showtime.'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleCreateTheaterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const rows = Array.from({ length: newTheaterAdmin.rows }, (_, i) => String.fromCharCode(65 + i));
      await apiClient.createTheaterAdmin({
        ...newTheaterAdmin,
        layout: { rows, cols: newTheaterAdmin.cols }
      });
      await fetchData();
      setIsAddingTheater(false);
      showNotification('success', 'Theater and admin account created.');
      setNewTheaterAdmin({ username: '', email: '', password: '', theaterName: '', city: '', screens: 1, rows: 8, cols: 10 });
    } catch (err) {
      showNotification('error', 'Failed to setup theater.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {notification && (
        <div className={`fixed top-20 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in fade-in duration-300 ${
          notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/10 border-rose-500/50 text-rose-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Simplified Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Dashboard Console
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase tracking-wider">
              {currentUser?.is_superuser ? 'Super Admin' : 'Theater Admin'}
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {currentUser?.is_superuser ? 'Global system management' : `Managing: ${currentUser?.managedTheater?.name}`}
          </p>
        </div>
        
        <div className="flex gap-2">
          {currentUser?.is_superuser && (
            <button onClick={() => setIsAddingTheater(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Add Theater
            </button>
          )}
          <button onClick={() => setIsAddingMovie(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Movie
          </button>
          <button onClick={() => setIsAddingShow(true)} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2">
            <Clock className="w-4 h-4" /> Schedule Show
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mb-8 border-b border-slate-800 overflow-x-auto no-scrollbar">
        <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<Activity className="w-4 h-4" />} label="Overview" />
        <TabButton active={activeTab === 'movies'} onClick={() => setActiveTab('movies')} icon={<Film className="w-4 h-4" />} label="Movies" />
        <TabButton active={activeTab === 'theaters'} onClick={() => setActiveTab('theaters')} icon={<MapPin className="w-4 h-4" />} label="Theaters" />
      </div>

      {/* Content */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<DollarSign className="text-emerald-500" />} label="Total Revenue" value={`₹${analytics?.total_revenue || 0}`} />
          <StatCard icon={<Users className="text-indigo-500" />} label="Total Bookings" value={analytics?.total_bookings || 0} />
          <StatCard icon={<Film className="text-rose-500" />} label="Active Movies" value={currentMovies.length} />
          <StatCard icon={<Building2 className="text-amber-500" />} label="Venues" value={theaters.length} />
        </div>
      )}

      {activeTab === 'movies' && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {currentMovies.map(movie => (
            <div key={movie.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
              <img src={movie.poster} className="aspect-[2/3] object-cover w-full" alt={movie.title} />
              <div className="p-3">
                <h3 className="text-sm font-bold truncate text-white">{movie.title}</h3>
                <p className="text-[10px] text-slate-500 mt-1 uppercase">{movie.duration}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'theaters' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {theaters.map(theater => (
            <div key={theater.id} className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-white">{theater.name}</h3>
                <MapPin className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-xs text-slate-500 uppercase font-medium">{theater.city}</p>
              <div className="mt-4 flex gap-4 text-[10px] text-slate-400 font-bold border-t border-slate-800 pt-3">
                <span>{theater.screens?.length || 1} SCREENS</span>
                <span>LAYOUT: {theater.layout?.rows?.length}x{theater.layout?.cols}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals remain mostly functional as they are essential logic */}
      {isAddingMovie && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Add New Movie</h2>
              <button onClick={() => setIsAddingMovie(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddMovie} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Movie Title" value={newMovie.title} onChange={v => setNewMovie({...newMovie, title: v})} />
                <Input label="Poster URL" value={newMovie.poster} onChange={v => setNewMovie({...newMovie, poster: v})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Genres (Action, Drama)" value={newMovie.genre} onChange={v => setNewMovie({...newMovie, genre: v})} />
                <Input label="Duration (e.g. 2h 30m)" value={newMovie.duration} onChange={v => setNewMovie({...newMovie, duration: v})} />
              </div>
              <textarea placeholder="Description" className="w-full bg-slate-800 border-slate-700 rounded-lg p-3 text-sm text-white resize-none h-24" value={newMovie.description} onChange={e => setNewMovie({...newMovie, description: e.target.value})} />
              <button disabled={isSubmitting} className="w-full py-3 bg-rose-600 text-white font-bold rounded-lg text-sm disabled:opacity-50">
                {isSubmitting ? 'Saving...' : 'Save Movie'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isAddingShow && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Schedule Showtime</h2>
              <button onClick={() => setIsAddingShow(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddShow} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Select Movie</label>
                <select className="w-full bg-slate-800 border-slate-700 rounded-lg p-3 text-sm text-white outline-none" required value={newShow.movieId} onChange={e => setNewShow({...newShow, movieId: e.target.value})}>
                  <option value="">Select a movie...</option>
                  {currentMovies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </div>
              {currentUser?.is_superuser && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Select Theater</label>
                  <select className="w-full bg-slate-800 border-slate-700 rounded-lg p-3 text-sm text-white outline-none" required value={newShow.theaterId} onChange={e => setNewShow({...newShow, theaterId: e.target.value})}>
                    <option value="">Select a theater...</option>
                    {theaters.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Input label="Time (e.g. 10:30 AM)" value={newShow.time} onChange={v => setNewShow({...newShow, time: v})} />
                <Input label="Price (INR)" value={String(newShow.price)} onChange={v => setNewShow({...newShow, price: parseInt(v) || 0})} type="number" />
              </div>
              <button disabled={isSubmitting} className="w-full py-3 bg-rose-600 text-white font-bold rounded-lg text-sm disabled:opacity-50">
                {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isAddingTheater && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">New Theater Setup</h2>
              <button onClick={() => setIsAddingTheater(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateTheaterAdmin} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Theater Name" value={newTheaterAdmin.theaterName} onChange={v => setNewTheaterAdmin({...newTheaterAdmin, theaterName: v})} />
                <Input label="City" value={newTheaterAdmin.city} onChange={v => setNewTheaterAdmin({...newTheaterAdmin, city: v})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Hall Rows" value={String(newTheaterAdmin.rows)} onChange={v => setNewTheaterAdmin({...newTheaterAdmin, rows: parseInt(v) || 8})} type="number" />
                <Input label="Hall Cols" value={String(newTheaterAdmin.cols)} onChange={v => setNewTheaterAdmin({...newTheaterAdmin, cols: parseInt(v) || 10})} type="number" />
              </div>
              <div className="border-t border-slate-800 pt-4 mt-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">Admin Login Provision</p>
                <div className="space-y-3">
                  <Input label="Email" value={newTheaterAdmin.email} onChange={v => setNewTheaterAdmin({...newTheaterAdmin, email: v})} type="email" />
                  <Input label="Password" value={newTheaterAdmin.password} onChange={v => setNewTheaterAdmin({...newTheaterAdmin, password: v})} type="password" />
                </div>
              </div>
              <button disabled={isSubmitting} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg text-sm disabled:opacity-50">
                {isSubmitting ? 'Creating...' : 'Initialize Theater'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: any, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`pb-3 px-1 flex items-center gap-2 font-bold text-xs uppercase tracking-wider transition-all border-b-2 ${active ? 'text-white border-rose-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
    {icon} {label}
  </button>
);

const StatCard: React.FC<{ icon: any, label: string, value: string | number }> = ({ icon, label, value }) => (
  <div className="bg-slate-900 p-5 rounded-lg border border-slate-800">
    <div className="flex justify-between items-start mb-4">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="bg-slate-800 p-1.5 rounded-md">{icon}</div>
    </div>
    <h3 className="text-xl font-bold text-white">{value}</h3>
  </div>
);

const Input: React.FC<{ label: string, value: string, onChange: (v: string) => void, type?: string }> = ({ label, value, onChange, type = "text" }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>
    <input type={type} required className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-rose-500 outline-none" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default AdminDashboard;
