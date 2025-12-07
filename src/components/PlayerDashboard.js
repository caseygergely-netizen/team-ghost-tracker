import React from 'react';
import { DollarSign, Play, BarChart2 } from 'lucide-react';

const PlayerDashboard = ({ currentUser, isShiftActive, onStartShift, onTeamPay, onLogMachine }) => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome, {currentUser.name}</h2>
        <p className="text-gray-400 mb-8">Ready to grind?</p>

        {!isShiftActive ? (
          <button onClick={onStartShift} className="bg-emerald-600 hover:bg-emerald-500 text-white text-2xl font-bold py-6 px-12 rounded-full shadow-lg transform transition hover:scale-105 flex items-center gap-3 mx-auto">
            <Play fill="currentColor" size={28} /> START SESSION
          </button>
        ) : (
          <div className="inline-block px-8 py-4 bg-emerald-900/30 border border-emerald-500 text-emerald-400 rounded-lg animate-pulse font-bold">
            LIVE SESSION ACTIVE
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={onTeamPay} className="bg-gray-800 hover:bg-gray-700 p-6 rounded-xl border border-gray-700 flex flex-col items-center gap-2 transition">
          <DollarSign size={32} className="text-yellow-500" />
          <span className="font-bold text-gray-300">Log Team Pay</span>
        </button>
        <button onClick={onLogMachine} className="bg-gray-800 hover:bg-gray-700 p-6 rounded-xl border border-gray-700 flex flex-col items-center gap-2 transition">
          <BarChart2 size={32} className="text-purple-500" />
          <span className="font-bold text-gray-300">Machine Log</span>
        </button>
      </div>
    </div>
  );
};

export default PlayerDashboard;