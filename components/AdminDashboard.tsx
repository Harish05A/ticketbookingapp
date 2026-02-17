
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Users, TrendingUp, DollarSign, Plus, Search, MapPin, Activity, Zap, Star, Film, X, Save, Clock, ShieldCheck, Key
} from 'lucide-react';
import { Movie, Booking, Show, Theater } from '../types';
import { getAdminAnalyticsSummary } from '../services/geminiService';
import { apiClient } from '../services/api';

interface AdminDashboardProps {
  movies: Movie[];
  bookings: Booking[];
  shows: Show[];
}

const COLORS = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ movies: initialMovies }) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'movies' | 'theaters'>('analytics');
  const [analytics, setAnalytics] = useState<any>(null);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [aiInsight, setAiInsight] = useState<string>('Analyzing your theater performance...');
  const [isAddingMovie, setIsAddingMovie] = useState(false);
  const [isAddingShow, setIsAddingShow] = useState(false);
  const [isAddingTheater, setIsAddingTheater] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [newMovie, setNewMovie] = useState({
    title: '', poster: '', genre: '', duration: '', description: '', release_date: new Date().toISOString().split('T')[0]
  });

  const [newShow, setNewShow] = useState({
    movieId: '', time: '10:00 AM', price: 250
  });

  const [newTheaterAdmin, setNewTheaterAdmin] = useState({
    username: '', password: '', theaterName: '', city: '', screens: 1
  });

  useEffect(() => {
    const userStr = localStorage.getItem('cinequest_user');
    if (userStr) setCurrentUser(JSON.parse(userStr));

    const fetchData = async () => {
      try {
        const [analyticData, theaterData] = await Promise.all([
          apiClient.getAnalytics(),
          apiClient.getTheaters()
        ]);
        setAnalytics(analyticData);
        setTheaters(theaterData);
        const insight = await getAdminAnalyticsSummary(analyticData.total_bookings, analyticData.total_revenue);
        setAiInsight(insight);
      } catch (err) {
        setAiInsight("Theater operational status: Optimal.");
      }
    };
    fetchData();
  }, []);

  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiClient.addMovie(newMovie);
    setIsAddingMovie(false);
    window.location.reload();
  };

  const handleAddShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.managedTheater && !currentUser?.is_superuser) return;
    const tId = currentUser?.is_superuser ? (theaters[0]?.id || 't1') : currentUser.managedTheater.id;
    await apiClient.addShow({
      ...newShow,
      theaterId: tId
    });
    setIsAddingShow(false);
    window.location.reload();
  };

  const handleCreateTheaterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiClient.createTheaterAdmin(newTheaterAdmin);
    setIsAddingTheater(false);
    setNewTheaterAdmin({ username: '', password: '', theaterName: '', city: '', screens: 1 });
    window.location.reload();
  };

  const revenueData = analytics ? [
    { name: 'Mon', rev: 4000 },
    { name: 'Tue', rev: 3000 },
    { name: 'Wed', rev: 2000 },
    { name: 'Thu', rev: 2780 },
    { name: 'Fri', rev: 1890 },
    { name: 'Sat', rev: 2390 },
    { name: 'Sun', rev: analytics?.total_revenue || 0 }
  ] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Console</h1>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${currentUser?.is_superuser ? 'bg-amber-600/20 text-amber-500 border-amber-500/30' : 'bg-rose-600/20 text-rose-500 border-rose-500/30'}`}>
              {currentUser?.is_superuser ? 'Global Superuser' : 'Theater Admin'}: {currentUser?.username}
            </span>
          </div>
          <p className="text-slate-500 font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-500" /> 
            {currentUser?.is_superuser ? 'Master Control Dashboard' : `Managing Venue: ${currentUser?.managedTheater?.name}`}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          {currentUser?.is_superuser && (
            <button 
              onClick={() => setIsAddingTheater(true)}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2"
            >
              <Key className="w-5 h-5" /> CREATE LOGIN
            </button>
          )}
          <button 
            onClick={() => setIsAddingMovie(true)}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-xl transition-all flex items-center gap-2 border border-slate-700"
          >
            <Plus className="w-5 h-5" /> NEW MOVIE
          </button>
          <button 
            onClick={() => setIsAddingShow(true)}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2"
          >
            <Clock className="w-5 h-5" /> ADD SHOWTIME
          </button>
        </div>
      </div>

      <div className="flex gap-8 border-b border-slate-800 mb-10 overflow-x-auto no-scrollbar">
        <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<TrendingUp className="w-4 h-4" />} label="Overview" />
        <TabButton active={activeTab === 'movies'} onClick={() => setActiveTab('movies')} icon={<Film className="w-4 h-4" />} label="Movies" />
        {currentUser?.is_superuser && (
          <TabButton active={activeTab === 'theaters'} onClick={() => setActiveTab('theaters')} icon={<MapPin className="w-4 h-4" />} label="Theaters" />
        )}
      </div>

      {isAddingTheater && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative">
            <button onClick={() => setIsAddingTheater(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-2">
              <Key className="text-amber-500" /> Register Theater Admin
            </h2>
            <form onSubmit={handleCreateTheaterAdmin} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Username" required className="bg-slate-800 border-slate-700 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-amber-500" value={newTheaterAdmin.username} onChange={e => setNewTheaterAdmin({...newTheaterAdmin, username: e.target.value})} />
                <input type="password" placeholder="Password" required className="bg-slate-800 border-slate-700 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-amber-500" value={newTheaterAdmin.password} onChange={e => setNewTheaterAdmin({...newTheaterAdmin, password: e.target.value})} />
              </div>
              <input type="text" placeholder="Theater Name" required className="w-full bg-slate-800 border-slate-700 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-amber-500" value={newTheaterAdmin.theaterName} onChange={e => setNewTheaterAdmin({...newTheaterAdmin, theaterName: e.target.value})} />
              <button type="submit" className="w-full py-4 bg-amber-600 rounded-2xl font-black text-white">CREATE ACCOUNT</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <>
          <div className="bg-gradient-to-r from-rose-600/10 to-indigo-600/10 border border-rose-500/20 p-8 rounded-[2rem] mb-12 flex items-center gap-8 shadow-inner">
            <div className="w-20 h-20 bg-rose-600 rounded-3xl flex items-center justify-center shrink-0">
              <Zap className="w-10 h-10 text-white fill-white" />
            </div>
            <div>
              <h4 className="text-rose-400 text-xs font-black tracking-widest uppercase mb-1">AI Business Consultant</h4>
              <p className="text-slate-100 text-xl font-bold tracking-tight">"{aiInsight}"</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <StatCard icon={<DollarSign className="text-emerald-500" />} label="Revenue" value={`₹${analytics?.total_revenue || 0}`} />
            <StatCard icon={<Users className="text-rose-500" />} label="Bookings" value={analytics?.total_bookings || 0} />
            <StatCard icon={<Activity className="text-sky-500" />} label="Market Share" value="84%" />
            <StatCard icon={<ShieldCheck className="text-purple-500" />} label="Status" value="Online" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-slate-900 p-10 rounded-[3rem] border border-slate-800 shadow-xl min-h-[400px]">
              <h3 className="text-xl font-bold mb-10">Revenue Flow</h3>
              <div className="h-80 w-full relative">
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px' }} />
                    <Bar dataKey="rev" fill="#f43f5e" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 p-10 rounded-[3rem] border border-slate-800 shadow-xl min-h-[400px]">
              <h3 className="text-xl font-bold mb-10">Movie Popularity</h3>
              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                  <PieChart>
                    <Pie 
                      data={analytics?.movie_popularity || []} 
                      innerRadius={60} 
                      outerRadius={100} 
                      paddingAngle={10} 
                      dataKey="bookings"
                    >
                      {analytics?.movie_popularity?.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'movies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {initialMovies.map(movie => (
            <div key={movie.id} className="flex gap-6 bg-slate-900 p-6 rounded-[2rem] border border-slate-800">
               <img src={movie.poster} className="w-24 h-36 rounded-xl object-cover shadow-lg" alt={movie.title} />
               <div className="flex-1 py-2">
                 <h4 className="font-bold text-lg mb-1">{movie.title}</h4>
                 <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-4">{movie.genre.join(', ')}</p>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: any, label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`pb-4 px-2 flex items-center gap-2 font-black text-sm uppercase tracking-widest transition-all border-b-2 ${
      active ? 'text-rose-500 border-rose-500' : 'text-slate-500 border-transparent hover:text-slate-300'
    }`}
  >
    {icon} {label}
  </button>
);

const StatCard: React.FC<{ icon: any, label: string, value: string | number }> = ({ icon, label, value }) => (
  <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-xl">
    <div className="w-12 h-12 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-6">{icon}</div>
    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
    <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
  </div>
);

export default AdminDashboard;
