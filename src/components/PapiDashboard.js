import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, History } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PapiDashboard = ({ players, sessions, withdrawals }) => {
  // Get Papi's specific data
  const papi = players.find(p => p.role === 'investor') || { investorBalance: 0, lifetimeEarnings: 0 };
  
  // Calculate stats
  // Filter withdrawals where method is "Investor Payout" or "Transfer from Oliver"
  const transfers = withdrawals.filter(w => w.method === 'Transfer from Oliver' || w.method === 'Investor Payout');

  // Prepare graph data (Cumulative PROFIT SHARE)
  // CHANGED: Now only counts sessions where Papi was actually involved
  const graphData = useMemo(() => {
    let runningTotal = 0;
    
    // 1. Sort oldest to newest
    // 2. Filter for only sessions where Papi had a stake
    const relevantSessions = [...sessions]
        .sort((a,b) => a.timestamp.seconds - b.timestamp.seconds)
        .filter(s => s.papiBacked || s.isLegacy); 

    return relevantSessions.map(s => {
      // Calculate Papi's cut for this specific session
      const cut = s.papiBacked ? (s.totalProfit * 0.50) : (s.totalProfit); 
      
      runningTotal += cut;
      return { 
          date: new Date(s.timestamp?.seconds * 1000).toLocaleDateString(), 
          profit: runningTotal 
      };
    });
  }, [sessions]);

  return (
    <div className="space-y-6">
      {/* BALANCE CARD */}
      <div className="bg-gray-800 p-6 rounded-xl border border-purple-500/50 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={100} /></div>
        <h2 className="text-gray-400 text-sm uppercase tracking-wider font-bold">Current Investor Balance</h2>
        <div className="text-5xl font-mono font-bold text-white mt-2">${papi.investorBalance?.toLocaleString()}</div>
        <p className="text-xs text-gray-500 mt-2">Total Lifetime Profit Share: <span className="text-green-400">${papi.lifetimeEarnings?.toLocaleString()}</span></p>
      </div>

      {/* GRAPH */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-gray-400 mb-4 font-bold flex items-center gap-2"><TrendingUp size={16}/> Investment Growth</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" hide />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} itemStyle={{ color: '#10B981' }}/>
              <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PAYMENT HISTORY */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-gray-400 mb-4 font-bold flex items-center gap-2"><History size={16}/> Payment History</h3>
        <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {transfers.length === 0 ? <p className="text-gray-500 italic">No payments yet.</p> : transfers.map((t, i) => (
            <div key={i} className="flex justify-between items-center bg-gray-700/30 p-2 rounded">
              <span className="text-gray-400 text-sm">{new Date(t.timestamp?.seconds * 1000).toLocaleDateString()}</span>
              <span className="text-green-400 font-mono">+${t.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PapiDashboard;