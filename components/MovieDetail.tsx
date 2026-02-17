
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Calendar, Star, MapPin, ShieldCheck, ChevronRight, Info, LogIn, AlertCircle, Timer } from 'lucide-react';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from '../services/firebase';
import { Movie, Show, Theater, Booking, SeatState } from '../types';
import SeatMap from './SeatMap';
import { apiClient } from '../services/api';

interface MovieDetailProps {
  movies: Movie[];
  shows: Show[];
  theaters: Theater[];
  onBooking: (booking: Booking) => void;
  currentUser: any;
}

const MovieDetail: React.FC<MovieDetailProps> = ({ movies, shows, theaters, onBooking, currentUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const movie = movies.find(m => String(m.id) === String(id));
  
  const [liveShow, setLiveShow] = useState<Show | null>(null);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holdExpiry, setHoldExpiry] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  const isHoldingRef = useRef(false);
  const selectedSeatsRef = useRef<string[]>([]);

  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  useEffect(() => {
    return () => {
      if (selectedShowId && currentUser && selectedSeatsRef.current.length > 0) {
        apiClient.releaseSeats(selectedShowId, selectedSeatsRef.current, currentUser.id).catch(console.error);
      }
    };
  }, [selectedShowId, currentUser]);

  useEffect(() => {
    if (!selectedShowId) {
      setLiveShow(null);
      return;
    }

    apiClient.cleanupExpiredHolds(selectedShowId).catch(console.error);

    const unsub = onSnapshot(doc(db, "shows", selectedShowId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedShow = { id: docSnap.id, ...data } as Show;
        setLiveShow(updatedShow);
        
        setSelectedSeats(prev => prev.filter(seatId => {
          const seat = updatedShow.seats[seatId];
          if (seat === 'available') return true;
          if (seat && typeof seat === 'object' && seat.status === 'held') {
            return seat.heldBy === currentUser?.id && seat.expiresAt > Date.now();
          }
          return false;
        }));
      }
    }, (err) => {
      console.error("Firestore Listen Error:", err);
      setError("Lost connection to live updates.");
    });

    return () => unsub();
  }, [selectedShowId, currentUser?.id]);

  useEffect(() => {
    if (!holdExpiry) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((holdExpiry - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        setHoldExpiry(null);
        setError("Seat reservation expired.");
        setSelectedSeats([]);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [holdExpiry]);

  if (!movie) return <div className="p-20 text-center text-slate-500">Movie not found</div>;

  const movieShows = shows.filter(s => String(s.movieId) === String(movie.id));

  const handleSeatToggle = async (seatId: string) => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }

    if (isHoldingRef.current) return;
    
    setError(null);
    const isAlreadySelected = selectedSeats.includes(seatId);
    
    if (!isAlreadySelected && selectedShowId) {
      isHoldingRef.current = true;
      try {
        const { expiresAt } = await apiClient.holdSeats(selectedShowId, [seatId], currentUser.id);
        setHoldExpiry(expiresAt);
        setSelectedSeats(prev => [...prev, seatId]);
      } catch (err: any) {
        setError(err.message || "Failed to reserve seat.");
      } finally {
        isHoldingRef.current = false;
      }
    } else if (selectedShowId) {
      try {
        await apiClient.releaseSeats(selectedShowId, [seatId], currentUser.id);
        setSelectedSeats(prev => prev.filter(s => s !== seatId));
      } catch (err) {
        console.error("Release seat error:", err);
      }
    }
  };

  const handleBooking = async () => {
    if (!liveShow || selectedSeats.length === 0) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const amount = Number(liveShow.price) * selectedSeats.length;
      const response = await apiClient.createBooking({
        showId: liveShow.id,
        seats: selectedSeats.join(','),
        amount: amount,
        userId: currentUser.id,
        movieTitle: movie.title,
        theaterName: liveShow.theater_name || 'Cinema',
        time: liveShow.time
      });
      
      onBooking({
        ...response.booking,
        movieTitle: movie.title,
        theaterName: liveShow.theater_name || 'Cinema',
        time: liveShow.time,
        seats: selectedSeats
      });
      navigate(`/booking-success/${response.booking.id}`);
    } catch (err: any) {
      setError(err.message || "Booking failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="pb-16">
      {/* Banner */}
      <div className="relative h-[300px] overflow-hidden bg-slate-900">
        <img src={movie.poster} className="w-full h-full object-cover opacity-20 blur-xl scale-110" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
        <div className="absolute inset-0 flex items-center px-4">
          <div className="max-w-7xl mx-auto w-full flex gap-8 items-center">
            <img src={movie.poster} className="w-40 h-60 object-cover rounded-lg shadow-2xl border border-slate-800" alt={movie.title} />
            <div>
              <div className="flex gap-2 mb-3">
                {movie.genre.map(g => <span key={g} className="text-[10px] font-bold uppercase bg-slate-800 px-2 py-0.5 rounded text-slate-300">{g}</span>)}
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">{movie.title}</h1>
              <div className="flex items-center gap-4 text-slate-400 text-sm font-medium">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-500 fill-amber-500" /> {movie.rating}</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {movie.duration}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-lg text-rose-500 flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}
          
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" /> Available Showtimes
            </h2>
            <div className="space-y-4">
              {theaters.map(theater => {
                const theaterShows = movieShows.filter(s => String(s.theaterId) === String(theater.id));
                if (theaterShows.length === 0) return null;
                return (
                  <div key={theater.id} className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="text-rose-500 w-4 h-4" />
                      <h3 className="font-bold text-slate-200">{theater.name}, {theater.city}</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {theaterShows.map((show: any) => (
                        <button
                          key={show.id}
                          onClick={() => {
                            setSelectedShowId(show.id);
                            setSelectedSeats([]);
                            setError(null);
                            setHoldExpiry(null);
                          }}
                          className={`px-6 py-3 rounded-lg font-bold text-sm transition-all border ${
                            selectedShowId === show.id 
                            ? 'bg-rose-600 border-rose-500 text-white shadow-lg' 
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {show.time}
                          <div className="text-[9px] opacity-70">₹{show.price}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {liveShow && (
            <section className="bg-slate-900 p-8 md:p-12 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex justify-center mb-12">
                <div className="w-full max-w-sm">
                  <div className="h-1.5 bg-slate-800 rounded-full" />
                  <p className="text-[9px] text-center text-slate-500 mt-3 font-bold uppercase tracking-[0.4em]">Screen</p>
                </div>
              </div>
              <SeatMap 
                seats={liveShow.seats || {}} 
                selectedSeats={selectedSeats} 
                onSeatToggle={handleSeatToggle} 
                currentUserId={currentUser?.id}
              />
              <div className="mt-12 flex flex-wrap justify-center gap-6 border-t border-slate-800 pt-8">
                <Legend color="bg-slate-800 border-slate-700" label="Available" />
                <Legend color="bg-rose-600" label="Selected" />
                <Legend color="bg-slate-700/30 border-slate-800 opacity-20" label="Reserved" />
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 sticky top-20 shadow-xl">
             {timeLeft > 0 && (
                <div className="mb-6 flex items-center justify-between bg-amber-500/10 text-amber-500 px-3 py-2 rounded-lg text-[10px] font-bold uppercase">
                   <div className="flex items-center gap-2"><Timer className="w-3 h-3" /> Reservation Time</div>
                   <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                </div>
             )}
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
              <ShieldCheck className="text-emerald-500 w-5 h-5" /> Booking Summary
            </h3>
            
            {!liveShow ? (
              <div className="text-center py-10">
                <p className="text-xs font-bold text-slate-600 uppercase">Select a showtime to proceed</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <SummaryItem label="Cinema" value={liveShow.theater_name || 'Theater'} />
                  <SummaryItem label="Time" value={liveShow.time} />
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 uppercase font-bold text-[9px]">Seats</span>
                    <div className="flex flex-wrap justify-end gap-1">
                       {selectedSeats.length > 0 ? selectedSeats.map(s => <span key={s} className="bg-slate-800 px-2 py-0.5 rounded text-[9px] font-bold text-slate-300">{s}</span>) : <span className="text-slate-700 text-xs">None</span>}
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-slate-800 pt-6">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-slate-400 font-bold text-xs uppercase">Payable Amount</span>
                    <span className="text-2xl font-bold text-white">₹{Number(liveShow.price) * selectedSeats.length}</span>
                  </div>

                  <button
                    disabled={selectedSeats.length === 0 || isProcessing}
                    onClick={handleBooking}
                    className={`w-full py-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                      selectedSeats.length > 0 && !isProcessing
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg active:scale-[0.98]' 
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {!currentUser ? (
                      <>Login to Book <LogIn className="w-4 h-4" /></>
                    ) : isProcessing ? (
                      <div className="flex items-center gap-2">
                         <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                         <span>Processing...</span>
                      </div>
                    ) : (
                      <>Confirm Booking <ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryItem: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-slate-500 uppercase font-bold text-[9px]">{label}</span>
    <span className="text-slate-200 text-xs font-bold">{value}</span>
  </div>
);

const Legend: React.FC<{ color: string, label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <div className={`w-3 h-3 rounded ${color}`} />
    <span className="text-[9px] font-bold text-slate-500 uppercase">{label}</span>
  </div>
);

export default MovieDetail;
