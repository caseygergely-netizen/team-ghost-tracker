import React, { useState, useMemo } from 'react';
import { DollarSign, Play, BarChart2, Users, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const OliverDashboard = ({ 
  players, isShiftActive, sessions,
  onStartShift, onTransferToPapi, 
  onTeamPay, onLogMachine, onLogTeamSession, onPapiLegacyAdd
}) => {
  const [transferAmount, setTransferAmount] = useState('');
  const [legacyAmount, setLegacyAmount] = useState('');
  
  // Calculate Papi's Balance
  const papi = players.find(p => p.role === 'investor');
  const papiBalance = papi ? papi.investorBalance : 0;

  // GRAPH DATA (Team Performance)
  const graphData = useMemo(() => {
    let runningTotal = 0;
    return [...(sessions || [])].reverse().map(s => {
      runningTotal += s.totalProfit;
      return { date: new Date(s.timestamp?.seconds * 1000).toLocaleDateString(), profit: runningTotal };
    });
  }, [sessions]);

  const handleTransfer = (e) => {
    e.preventDefault();
    if(transferAmount > 0) {
      onTransferToPapi(parseFloat(transferAmount));
      setTransferAmount('');
    }
  };

  const handleLegacyAdd = (e) => {
      e.preventDefault();
      if(legacyAmount !== '' && !isNaN(legacyAmount)) {
          if(window.confirm(`Add $${legacyAmount} to Papi's balance (Legacy Adjustment)?`)) {
            onPapiLegacyAdd(parseFloat(legacyAmount));
            setLegacyAmount('');
          }
      }
  };

  return (
    <div className="space-y-8">
      {/* SECTION A: BACKER CONTROLS */}
      <div className="bg-gray-800 border border-blue-500/30 rounded-xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
          <DollarSign className="text-blue-400"/> Backer Controls
        </h2>
        
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div>
                    <p className="text-gray-400 text-sm">Owed to Papi Ghost</p>
                    <p className="text-3xl font-mono font-bold text-red-400">${papiBalance?.toLocaleString()}</p>
                </div>

                <form onSubmit={handleTransfer} className="flex gap-2 w-full md:w-auto">
                    <input 
                    type="number" 
                    placeholder="Pay Papi" 
                    className="bg-gray-900 text-white p-3 rounded border border-gray-600 w-full md:w-32"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 rounded whitespace-nowrap">
                    Transfer
                    </button>
                </form>
            </div>

            {/* Legacy Adjustment */}
            <form onSubmit={handleLegacyAdd} className="flex items-center gap-2 pt-4 border-t border-gray-700">
                <span className="text-xs text-purple-400 font-bold">Legacy Adjust:</span>
                <input 
                    type="number" 
                    placeholder="+/- Amount" 
                    className="bg-gray-900 text-white p-2 text-sm rounded border border-gray-600 w-28"
                    value={legacyAmount}
                    onChange={(e) => setLegacyAmount(e.target.value)}
                />
                <button type="submit" className="bg-purple-900/50 hover:bg-purple-800 text-purple-200 text-xs font-bold px-3 py-2 rounded border border-purple-500/30">
                    Update Papi
                </button>
            </form>
        </div>
      </div>

      {/* SECTION B: TEAM GRAPH */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-gray-400 mb-4 font-bold flex items-center gap-2"><TrendingUp size={16}/> Team Performance</h3>
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" hide />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION C: PLAYER CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 gap-4">
          <button onClick={onLogTeamSession} className="bg-blue-900/20 hover:bg-blue-900/40 border border-blue-500/50 p-4 rounded-xl flex items-center justify-between group transition-all">
            <span className="text-blue-100 font-bold">Log Team Play</span>
            <Users className="text-blue-400 group-hover:text-blue-300" />
          </button>

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