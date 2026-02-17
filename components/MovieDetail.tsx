
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Calendar, Star, MapPin, Ticket, ShieldCheck, ChevronRight, Info, LogIn } from 'lucide-react';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from '../services/firebase';
import { Movie, Show, Theater, Booking, BookingStatus } from '../types';
import SeatMap from './SeatMap';
import { getMovieAIPrediction } from '../services/geminiService';
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
  const [aiInsight, setAiInsight] = useState<{hypeQuote: string, viewerPersona: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (movie) {
      getMovieAIPrediction(movie.title).then(setAiInsight);
    }
  }, [movie]);

  // Real-time listener for the selected show's seats
  useEffect(() => {
    if (!selectedShowId) {
      setLiveShow(null);
      return;
    }

    const unsub = onSnapshot(doc(db, "shows", selectedShowId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLiveShow({ id: docSnap.id, ...data } as Show);
      }
    });

    return () => unsub();
  }, [selectedShowId]);

  // Real-time synchronization: Deselect seats that become "booked" while the user is looking
  useEffect(() => {
    if (liveShow && liveShow.seats) {
      setSelectedSeats(prev => prev.filter(seatId => liveShow.seats[seatId] === 'available'));
    }
  }, [liveShow?.seats]);

  if (!movie) return <div className="p-20 text-center text-slate-500">Movie not found</div>;

  const movieShows = shows.filter(s => String(s.movieId) === String(movie.id));

  const handleSeatToggle = (seatId: string) => {
    setSelectedSeats(prev => 
      prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId]
    );
  };

  const handleBooking = async () => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }

    if (!liveShow || selectedSeats.length === 0) return;
    
    setIsProcessing(true);
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
    } catch (err) {
      alert("Booking failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="pb-20">
      <div className="relative h-[40vh] md:h-[60vh] overflow-hidden">
        <img src={movie.poster} className="w-full h-full object-cover blur-md opacity-30 scale-110" alt="Backdrop" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 items-end">
            <div className="w-48 md:w-64 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-900 shrink-0">
              <img src={movie.poster} className="w-full h-full object-cover" alt={movie.title} />
            </div>
            <div className="flex-1 pb-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-rose-500/20 text-rose-500 px-3 py-1 rounded-full text-xs font-bold uppercase">{movie.genre.join(', ')}</span>
                <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {movie.rating}
                </span>
                <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {movie.duration}
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white mb-2 uppercase tracking-tighter">{movie.title}</h1>
              <p className="text-slate-300 max-w-2xl text-sm md:text-base mb-4 opacity-70">{movie.description}</p>
              
              {aiInsight && (
                <div className="bg-rose-500/10 border-l-4 border-rose-500 p-4 rounded-r-xl max-w-xl animate-in fade-in duration-700">
                  <p className="text-rose-400 italic font-medium mb-1">"{aiInsight.hypeQuote}"</p>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Persona: {aiInsight.viewerPersona}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2 uppercase tracking-tighter">
              <Calendar className="text-rose-500 w-5 h-5" /> Select Show Time
            </h2>
            <div className="space-y-4">
              {theaters.map(theater => {
                const theaterShows = movieShows.filter(s => String(s.theaterId) === String(theater.id));
                if (theaterShows.length === 0) return null;
                return (
                  <div key={theater.id} className="bg-slate-900 p-8 rounded-3xl border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-6">
                      <MapPin className="text-rose-500 w-4 h-4" />
                      <h3 className="font-bold text-lg">{theater.name}, {theater.city}</h3>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {theaterShows.map((show: any) => (
                        <button
                          key={show.id}
                          onClick={() => {
                            setSelectedShowId(show.id);
                            setSelectedSeats([]);
                          }}
                          className={`px-8 py-4 rounded-2xl font-black transition-all border ${
                            selectedShowId === show.id 
                            ? 'bg-rose-600 border-rose-500 text-white shadow-xl shadow-rose-600/30 scale-105' 
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {show.time}
                          <div className="text-[10px] opacity-70 mt-1">₹{show.price}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {liveShow && (
            <section className="bg-slate-900 p-10 rounded-[3rem] border border-slate-800 animate-in slide-in-from-bottom-8 duration-500 shadow-2xl">
              <div className="flex justify-center mb-16">
                <div className="w-full max-w-md">
                  <div className="h-1.5 bg-rose-600 rounded-full shadow-[0_0_30px_rgba(225,29,72,0.8)]" />
                  <p className="text-[10px] text-center text-slate-500 mt-4 font-black tracking-[0.4em] uppercase">Cinema Screen</p>
                </div>
              </div>
              <SeatMap 
                seats={liveShow.seats || {}} 
                selectedSeats={selectedSeats} 
                onSeatToggle={handleSeatToggle} 
              />
              
              <div className="mt-12 flex justify-center gap-8 border-t border-slate-800 pt-8">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-800 border border-slate-700 rounded-sm" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-rose-600 rounded-sm shadow-sm" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-700/50 border border-slate-800 rounded-sm" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Booked</span>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 sticky top-24 shadow-2xl">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2 uppercase tracking-tighter">
              <ShieldCheck className="text-rose-500" /> Checkout
            </h3>
            
            {!liveShow ? (
              <div className="text-center py-12 text-slate-600">
                <Info className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Select a showtime and seat to proceed.</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 uppercase tracking-widest font-black text-[10px]">Show</span>
                    <span className="text-white font-bold">{liveShow.time}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 uppercase tracking-widest font-black text-[10px]">Seats</span>
                    <span className="text-rose-500 font-bold">{selectedSeats.length > 0 ? selectedSeats.join(', ') : '---'}</span>
                  </div>
                </div>
                
                <div className="border-t border-slate-800 pt-8">
                  <div className="flex justify-between items-end">
                    <span className="text-slate-500 font-bold text-sm">Amount to pay</span>
                    <span className="text-4xl font-black text-white">₹{Number(liveShow.price) * selectedSeats.length}</span>
                  </div>
                </div>

                <button
                  disabled={selectedSeats.length === 0 || isProcessing}
                  onClick={handleBooking}
                  className={`w-full py-5 rounded-[1.5rem] font-black text-lg transition-all flex items-center justify-center gap-2 ${
                    selectedSeats.length > 0 && !isProcessing
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-2xl shadow-rose-600/40 translate-y-0 active:translate-y-1' 
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {!currentUser ? (
                    <>LOGIN TO BOOK <LogIn className="w-5 h-5" /></>
                  ) : isProcessing ? (
                    <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>PAY NOW <ChevronRight className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetail;
