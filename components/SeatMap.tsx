
import React from 'react';

interface SeatMapProps {
  seats: Record<string, 'available' | 'booked' | 'selected'>;
  selectedSeats: string[];
  onSeatToggle: (seatId: string) => void;
}

const SeatMap: React.FC<SeatMapProps> = ({ seats, selectedSeats, onSeatToggle }) => {
  const rows = ['A', 'B', 'C', 'D', 'E'];
  const cols = [1, 2, 3, 4, 5];

  return (
    <div className="flex flex-col items-center gap-6">
      {rows.map(row => (
        <div key={row} className="flex gap-4 md:gap-6 items-center">
          <span className="w-6 text-xs font-black text-slate-700 uppercase tracking-tighter text-center">{row}</span>
          <div className="flex gap-4">
            {cols.map(col => {
              const seatId = `${row}${col}`;
              const status = seats[seatId];
              const isSelected = selectedSeats.includes(seatId);
              const isBooked = status === 'booked';

              return (
                <button
                  key={seatId}
                  disabled={isBooked}
                  onClick={() => onSeatToggle(seatId)}
                  title={isBooked ? "Reserved" : `Seat ${seatId}`}
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-xl text-[10px] font-black transition-all flex items-center justify-center border-2 ${
                    isBooked 
                    ? 'bg-slate-700/20 text-slate-800 cursor-not-allowed border-slate-800' 
                    : isSelected 
                      ? 'bg-rose-600 text-white scale-110 shadow-xl shadow-rose-600/40 border-rose-400 z-10' 
                      : 'bg-slate-800 text-slate-500 hover:border-rose-500/50 border-slate-700 hover:scale-105'
                  }`}
                >
                  {col}
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
