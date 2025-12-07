import React, { useState } from 'react';
import { DollarSign, Play, BarChart2 } from 'lucide-react';

const OliverDashboard = ({ 
  players, isShiftActive, 
  onStartShift, onTransferToPapi, 
  onTeamPay, onLogMachine 
}) => {
  const [transferAmount, setTransferAmount] = useState('');
  
  // Calculate Papi's Balance for display (so Oliver knows what he owes)
  const papi = players.find(p => p.role === 'investor');
  const papiBalance = papi ? papi.investorBalance : 0;

  const handleTransfer = (e) => {
    e.preventDefault();
    if(transferAmount > 0) {
      onTransferToPapi(parseFloat(transferAmount));
      setTransferAmount('');
    }
  };

  return (
    <div className="space-y-8">
      {/* SECTION A: BACKER CONTROLS */}
      <div className="bg-gray-800 border border-blue-500/30 rounded-xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
          <DollarSign className="text-blue-400"/> Backer Controls
        </h2>
        
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          <div>
            <p className="text-gray-400 text-sm">Owed to Papi Ghost</p>
            <p className="text-3xl font-mono font-bold text-red-400">${papiBalance?.toLocaleString()}</p>
          </div>

          <form onSubmit={handleTransfer} className="flex gap-2 w-full md:w-auto">
            <input 
              type="number" 
              placeholder="Amount" 
              className="bg-gray-900 text-white p-3 rounded border border-gray-600 w-full md:w-32"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 rounded whitespace-nowrap">
              Transfer to Papi
            </button>
          </form>
        </div>
      </div>

      {/* SECTION B: PLAYER CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Live Shift Control */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center flex flex-col justify-center items-center min-h-[200px]">
          <h3 className="text-gray-400 font-bold mb-4">Live Session</h3>
          {!isShiftActive ? (
            <button onClick={onStartShift} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xl font-bold py-4 px-8 rounded-full shadow-lg transform transition hover:scale-105 flex items-center gap-2">
              <Play fill="currentColor" /> Start Session
            </button>
          ) : (
            <div className="animate-pulse text-emerald-400 font-bold border border-emerald-500/50 p-4 rounded-lg bg-emerald-900/20">
              Shift in Progress...<br/>
              <span className="text-xs text-gray-400">Click the green bar below to end</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4">
          <button onClick={onTeamPay} className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl border border-gray-700 flex items-center justify-between group">
            <span className="text-gray-300 font-bold group-hover:text-white">Log Team Pay</span>
            <DollarSign className="text-yellow-500" />
          </button>
          <button onClick={onLogMachine} className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl border border-gray-700 flex items-center justify-between group">
            <span className="text-gray-300 font-bold group-hover:text-white">Log Machine Data</span>
            <BarChart2 className="text-purple-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OliverDashboard;