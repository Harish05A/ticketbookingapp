
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Download, Share2, Ticket, MapPin, Clock, Home } from 'lucide-react';
import { Booking } from '../types';

interface BookingSuccessProps {
  bookings: Booking[];
}

const BookingSuccess: React.FC<BookingSuccessProps> = ({ bookings }) => {
  const { id } = useParams();
  const booking = bookings.find(b => b.id === id);

  if (!booking) return (
    <div className="p-20 text-center">
      <h2 className="text-2xl font-bold mb-4">Booking Not Found</h2>
      <Link to="/" className="text-rose-500">Back to Home</Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-20">
      <div className="text-center mb-12 animate-in zoom-in duration-500">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]" />
        <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">Booking Confirmed!</h1>
        <p className="text-slate-400">Your E-Ticket has been sent to your registered email and phone.</p>
      </div>

      <div className="bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl relative">
        {/* Ticket Header */}
        <div className="bg-rose-600 p-8 text-white relative">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase opacity-70 mb-1">CineQuest Premium Pass</p>
              <h2 className="text-2xl font-black uppercase tracking-tighter">{booking.movieTitle}</h2>
            </div>
            <Ticket className="w-8 h-8 opacity-40 rotate-12" />
          </div>
          {/* Decorative cutouts */}
          <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-slate-950 rounded-full" />
          <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-slate-950 rounded-full" />
        </div>

        {/* Ticket Body */}
        <div className="p-8 pt-10 grid grid-cols-2 gap-8 border-b border-dashed border-slate-700/50">
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">Cinema & Hall</p>
            <p className="text-white font-bold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> {booking.theaterName}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">Show Time</p>
            <p className="text-white font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-rose-500" /> {booking.time}, Today
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">Reserved Seats</p>
            <p className="text-rose-500 font-black text-xl">{booking.seats.join(', ')}</p>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">Booking ID</p>
            <p className="text-white font-mono text-sm">{booking.id}</p>
          </div>
        </div>

        {/* Ticket Footer */}
        <div className="p-8 flex flex-col items-center justify-center bg-slate-900/50">
          <div className="bg-white p-3 rounded-2xl shadow-xl mb-4">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${booking.id}`} 
              className="w-32 h-32" 
              alt="Scan Me" 
            />
          </div>
          <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-6 text-center">Scan at Cinema Entrance</p>
          
          <div className="flex gap-4 w-full">
            <button className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors">
              <Download className="w-4 h-4" /> Download
            </button>
            <button className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 font-bold hover:text-white transition-colors">
          <Home className="w-4 h-4" /> Return to Home
        </Link>
      </div>
    </div>
  );
};

export default BookingSuccess;
