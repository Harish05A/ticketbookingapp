
import React from 'react';
import { Lock } from 'lucide-react';

interface SeatMapProps {
  seats: Record<string, any>;
  selectedSeats: string[];
  onSeatToggle: (seatId: string) => void;
  currentUserId?: string;
}

const SeatMap: React.FC<SeatMapProps> = ({ seats, selectedSeats, onSeatToggle, currentUserId }) => {
  const seatKeys = Object.keys(seats);
  const rows = Array.from(new Set(seatKeys.map(key => key.charAt(0)))).sort();
  
  const getColsForRow = (rowPrefix: string) => {
    return seatKeys
      .filter(key => key.startsWith(rowPrefix))
      .map(key => parseInt(key.substring(1)))
      .sort((a, b) => a - b);
  };

  return (
    <div className="flex flex-col items-center gap-6 md:gap-8 overflow-x-auto no-scrollbar pb-4 max-w-full">
      {rows.map(row => (
        <div key={row} className="flex gap-4 md:gap-6 items-center shrink-0">
          <span className="w-6 md:w-8 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">{row}</span>
          <div className="flex gap-2 md:gap-4">
            {getColsForRow(row).map(col => {
              const seatId = `${row}${col}`;
              const seatData = seats[seatId];
              
              const isBooked = seatData === 'booked';
              const isHeldByOthers = typeof seatData === 'object' && seatData.status === 'held' && seatData.heldBy !== currentUserId && seatData.expiresAt > Date.now();
              const isHeldByMe = typeof seatData === 'object' && seatData.status === 'held' && seatData.heldBy === currentUserId;
              const isSelected = selectedSeats.includes(seatId) || isHeldByMe;

              return (
                <button
                  key={seatId}
                  disabled={isBooked || isHeldByOthers}
                  onClick={() => onSeatToggle(seatId)}
                  className={`relative w-9 h-9 md:w-12 md:h-12 rounded-xl text-[9px] md:text-[10px] font-black transition-all flex items-center justify-center border-2 ${
                    isBooked 
                    ? 'bg-slate-800/40 text-slate-900 border-slate-900 cursor-not-allowed opacity-30' 
                    : isHeldByOthers
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-500/40 cursor-not-allowed animate-pulse'
                      : isSelected 
                        ? 'bg-rose-600 text-white scale-110 shadow-2xl shadow-rose-600/50 border-rose-400 z-10' 
                        : 'bg-slate-900 text-slate-600 hover:border-rose-500/50 border-slate-800 hover:scale-110 active:scale-95'
                  }`}
                >
                  {isHeldByOthers ? (
                    <Lock className="w-3 h-3 md:w-4 md:h-4 text-amber-500/50" />
                  ) : (
                    col
                  )}
                  
                  {isHeldByOthers && (
                    <div className="absolute inset-0 bg-amber-500/5 rounded-xl pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SeatMap;
