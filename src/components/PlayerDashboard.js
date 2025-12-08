import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  CheckCircle, ArrowRightLeft, DollarSign, History, Trash2, Edit2, BookOpen, Activity, Play, BarChart2, Users 
} from 'lucide-react';
import { getTierDetails, round5 } from '../utils';

const PlayerDashboard = ({ 
  currentUser, viewingUser, players, sessions, withdrawals, isShiftActive,
  onStartShift, onTeamPay, onLogMachine, onCashout, onTransfer, 
  onEditSession, onDeleteSession, onDeleteWithdrawal, setView 
}) => {
  
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');

  // --- IDENTITY LOGIC ---
  const targetUser = viewingUser || currentUser;
  const isSpectator = !!viewingUser;

  // --- STATS LOGIC ---
  const myStats = players.find(p => p.id === targetUser.id) || targetUser;
  const surplus = myStats.heldCash - myStats.pinnedBankroll;
  const tier = getTierDetails(myStats.peakScore || myStats.tierScore || myStats.lifetimeProfit, myStats.currentTier);
  const playerShare = round5(surplus * tier.playerKeep);
  const backerShare = surplus - playerShare;

  let statusLabel = surplus > 0 ? "Current Profit" : (surplus < 0 ? "Current Makeup" : "Current Status");

  // Graph Data
  const chartData = useMemo(() => {
    const mySessions = sessions
      .filter(s => s.playersInvolved && s.playersInvolved.includes(targetUser.id))
      .sort((a,b) => a.timestamp - b.timestamp);
    let runningTotal = 0;
    return mySessions.map(s => { 
        const effectiveProfit = s.papiBacked ? s.totalProfit * 0.5 : s.totalProfit;
        const share = effectiveProfit / s.playersInvolved.filter(pid => { const p = players.find(x => x.id === pid); return p && p.role !== 'investor'; }).length;
        runningTotal += share; 
        return { date: new Date(s.timestamp?.seconds * 1000).toLocaleDateString(), profit: runningTotal }; 
    });
  }, [sessions, targetUser.id, players]);

  // Hourly Stats
  const hourlyStats = useMemo(() => {
    const totalHours = myStats.lifetimeHours || 0;
    const totalEarnings = myStats.lifetimeEarnings || 0;
    const gross = totalHours > 0 ? (totalEarnings / totalHours) : 0;
    return { gross, net: gross * tier.playerKeep, hours: totalHours };
  }, [myStats, tier]);

  // History List
  const history = sessions
    .filter(s => s.playersInvolved && s.playersInvolved.includes(targetUser.id))
    .sort((a,b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  return (
    <div className="space-y-6">
      
      {/* --- START SESSION BUTTON (Hide if Spectating) --- */}
      {!isSpectator && (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center shadow-lg">
            {!isShiftActive ? (
            <button onClick={onStartShift} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-xl font-bold py-4 px-12 rounded-full shadow-lg transform transition hover:scale-105 flex items-center justify-center gap-3 mx-auto">
                <Play fill="currentColor" size={24} /> START SESSION
            </button>
            ) : (
            <div className="inline-block px-8 py-3 bg-emerald-900/30 border border-emerald-500 text-emerald-400 rounded-lg animate-pulse font-bold">
                LIVE SESSION ACTIVE
            </div>
            )}
        </div>
      )}

      {/* --- RICH STATS CARD --- */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-6 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex justify-between items-start relative z-10">
            <div>
                <h2 className="text-2xl font-bold text-white">{myStats.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${tier.color} ${tier.text}`}>
                        {tier.name} ({Math.round(tier.playerKeep * 100)}%)
                    </span>
                </div>
            </div>
            <div className="text-right">
                <div className="text-xs text-gray-400">{statusLabel}</div>
                <div className={`text-3xl font-bold ${surplus >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {surplus.toLocaleString()}
                </div>
            </div>
        </div>
        
        <div className="flex gap-4 mt-2">
             <div className="text-xs bg-gray-900/50 px-2 py-1 rounded text-gray-400">Hourly: <span className="text-white font-bold">${Math.round(hourlyStats.gross)}</span></div>
             <div className="text-xs bg-gray-900/50 px-2 py-1 rounded text-gray-400">Peak Score: <span className="text-yellow-500 font-bold">${(myStats.peakScore || myStats.tierScore || 0).toLocaleString()}</span></div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-black/20 rounded-lg relative z-10">
            <div><div className="text-xs text-gray-400 mb-1">Held Cash</div><div className="text-xl font-mono text-emerald-300">${myStats.heldCash.toLocaleString()}</div></div>
            <div><div className="text-xs text-gray-400 mb-1">Pinned</div><div className="text-xl font-mono text-blue-300">${myStats.pinnedBankroll.toLocaleString()}</div></div>
        </div>
        
        {/* ACTION BUTTONS (Hide if Spectating) */}
        {!isSpectator && (
            <div className="mt-6 border-t border-gray-700 pt-4 flex gap-2">
                {surplus > 0 ? (
                    <button onClick={() => setShowSettleModal(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"><CheckCircle size={20} /> Settle Up</button>
                ) : surplus === 0 ? (
                    <div className="flex-1 bg-gray-800 border border-emerald-900/30 text-emerald-500 py-3 rounded-lg text-center text-sm flex items-center justify-center font-bold">Even. Go get it! 🚀</div>
                ) : (
                    <div className="flex-1 bg-gray-800 border border-red-900/50 text-gray-400 py-3 rounded-lg text-center text-sm flex items-center justify-center">In Makeup</div>
                )}
                <button onClick={() => setShowTransferModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 rounded-lg flex items-center justify-center"><ArrowRightLeft size={20} /></button>
            </div>
        )}
      </div>

      {/* --- RECENT WITHDRAWALS (Restored!) --- */}
      {withdrawals && withdrawals.length > 0 && (
          <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
              <h4 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1"><History size={12}/> Recent Withdrawals</h4>
              <div className="space-y-1">
                  {withdrawals.map(w => (
                      <div key={w.id} className="flex justify-between text-xs text-gray-300">
                          <span>{w.method}</span>
                          <div className="flex items-center gap-2">
                              <span className="text-emerald-400 font-bold">-${w.amount}</span>
                              {!isSpectator && (
                                <button onClick={() => onDeleteWithdrawal(w.id)} className="text-gray-600 hover:text-red-400"><Trash2 size={10}/></button>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- QUICK ACTIONS (Hide if Spectating) --- */}
      {!isSpectator && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button onClick={() => setView('logTeamSession')} className="bg-blue-900/20 hover:bg-blue-900/40 p-4 rounded-xl border border-blue-500/50 flex flex-col items-center gap-2 transition group">
            <Users size={24} className="text-blue-400 group-hover:text-blue-300" />
            <span className="font-bold text-blue-100">Log Team Play</span>
            </button>

            <button onClick={onTeamPay} className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl border border-gray-700 flex flex-col items-center gap-2 transition">
            <DollarSign size={24} className="text-yellow-500" />
            <span className="font-bold text-gray-300">Log Team Pay</span>
            </button>

            <button onClick={onLogMachine} className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl border border-gray-700 flex flex-col items-center gap-2 transition">
            <BarChart2 size={24} className="text-purple-500" />
            <span className="font-bold text-gray-300">Machine Log</span>
            </button>

            <button onClick={() => setView('playInfo')} className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl border border-gray-700 flex flex-col items-center gap-2 transition">
            <BookOpen size={24} className="text-cyan-400" />
            <span className="font-bold text-gray-300">Play Info</span>
            </button>
        </div>
      )}

      {/* --- PROFIT GRAPH --- */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 h-64">
        <h3 className="text-sm text-gray-400 mb-4">Profit Trend (All Time)</h3>
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" hide />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} itemStyle={{ color: '#10B981' }} />
                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
      </div>

      {/* --- HISTORY --- */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700 font-bold flex items-center gap-2"><Activity size={18}/> Session History</div>
        <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-900 text-gray-400">
                    <tr><th className="p-3">Date</th><th className="p-3">Casino</th><th className="p-3 text-right">Result</th>{!isSpectator && <th className="p-3 text-right">Actions</th>}</tr>
                </thead>
                <tbody>
                    {history.map(s => {
                        const myShare = round5(s.totalProfit / s.playersInvolved.length);
                        return (
                            <tr key={s.id} className="border-b border-gray-700">
                                <td className="p-3 text-gray-400"><div>{new Date(s.timestamp?.seconds * 1000).toLocaleDateString()}</div></td>
                                <td className="p-3 font-medium">{s.casino}</td>
                                <td className={`p-3 text-right font-bold ${s.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {s.playersInvolved.length > 1 ? (
                                        <div className="flex flex-col items-end"><span className="text-amber-400">${myShare}</span><span className="text-[10px] text-gray-500">split</span></div>
                                    ) : (
                                        `$${s.totalProfit}`
                                    )}
                                </td>
                                {!isSpectator && (
                                    <td className="p-3 text-right flex justify-end gap-2">
                                        <button onClick={() => onEditSession(s)} className="p-1 hover:text-emerald-400"><Edit2 size={16} /></button>
                                        <button onClick={() => onDeleteSession(s.id)} className="p-1 hover:text-red-400"><Trash2 size={16} /></button>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- MODALS --- */}
      {showSettleModal && (<div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"><div className="bg-gray-800 p-6 rounded-xl border border-emerald-500 max-w-sm w-full"><h2 className="text-xl font-bold text-white mb-4">End of Shift</h2><div className="space-y-4 mb-6"><div className="flex justify-between text-gray-400 text-sm"><span>Total Surplus:</span><span className="text-white">${surplus}</span></div><div className="bg-gray-900 p-4 rounded space-y-2"><div className="flex justify-between items-center"><span className="text-emerald-400 font-bold">You Take</span><span className="text-xl font-bold text-emerald-400">${playerShare}</span></div><div className="border-t border-gray-800 my-2"></div><div className="flex justify-between items-center"><span className="text-blue-400">Backer Keeps</span><span className="text-xl font-bold text-blue-400">${backerShare}</span></div></div></div><div className="flex gap-3"><button onClick={() => setShowSettleModal(false)} className="flex-1 bg-gray-700 py-3 rounded text-sm font-bold">Cancel</button><button onClick={() => { onCashout(playerShare, backerShare); setShowSettleModal(false); }} className="flex-1 bg-emerald-600 py-3 rounded text-sm font-bold hover:bg-emerald-500">Confirm</button></div></div></div>)}
      {showTransferModal && (<div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"><div className="bg-gray-800 p-6 rounded-xl border border-blue-500 max-w-sm w-full"><h2 className="text-xl font-bold text-white mb-4">Transfer to Backer</h2><div className="space-y-4 mb-6"><p className="text-sm text-gray-400">Reduce your Cash and Pin by this amount.</p><input type="number" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-xl font-bold text-white" placeholder="5000" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} /></div><div className="flex gap-3"><button onClick={() => setShowTransferModal(false)} className="flex-1 bg-gray-700 py-3 rounded text-sm font-bold">Cancel</button><button onClick={() => { onTransfer(parseFloat(transferAmount)); setShowTransferModal(false); setTransferAmount(''); }} className="flex-1 bg-blue-600 py-3 rounded text-sm font-bold hover:bg-blue-500">Confirm Transfer</button></div></div></div>)}
    </div>
  );
};

export default PlayerDashboard;