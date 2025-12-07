import React, { useState, useEffect } from 'react';
import { Clock, StopCircle } from 'lucide-react';

const ActiveShift = ({ shift, onEnd }) => {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const start = new Date(shift.startTime);
      const diff = now - start;
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setElapsed(`${hours}h ${mins}m`);
    }, 1000);
    return () => clearInterval(timer);
  }, [shift]);

  return (
    <div 
      onClick={onEnd}
      className="fixed bottom-0 left-0 right-0 bg-emerald-600 text-white p-4 shadow-lg flex justify-between items-center cursor-pointer z-50 animate-pulse hover:bg-emerald-500 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-full">
            <Clock size={20} className="animate-spin-slow" />
        </div>
        <div>
            <div className="text-xs font-bold opacity-80 uppercase tracking-wider">Active Shift</div>
            <div className="font-bold text-lg">{shift.casino} • {elapsed}</div>
        </div>
      </div>
      <button className="bg-white text-emerald-800 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
        <StopCircle size={16} /> End Shift
      </button>
    </div>
  );
};

export default ActiveShift;