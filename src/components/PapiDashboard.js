import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, History } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PapiDashboard = ({ players, sessions, withdrawals }) => {
  // Get Papi's specific data
  const papi = players.find(p => p.role === 'investor') || { investorBalance: 0, lifetimeEarnings: 0 };
  
  // Calculate stats
  // Filter withdrawals where method is "Investor Payout" or "Transfer from Oliver"
  const transfers = withdrawals.filter(w => w.method === 'Transfer from Oliver' || w.method === 'Investor Payout');

  // Prepare graph data (Cumulative Team Profit)
  const graphData = useMemo(() => {
    let runningTotal = 0;
    // Filter for valid sessions, reverse to show oldest first
    return [...sessions].reverse().map(s => {
      runningTotal += s.totalProfit;
      return { date: new Date(s.timestamp?.seconds * 1000).toLocaleDateString(), profit: runningTotal };
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
        <h3 className="text-gray-400 mb-4 font-bold flex items-center gap-2"><TrendingUp size={16}/> Team Performance</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" hide />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
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