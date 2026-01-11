import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  CheckCircle, ArrowRightLeft, DollarSign, History, Trash2, Edit2, BookOpen, Activity, Play, BarChart2, Users, Gift, Briefcase, TrendingUp, Clock 
} from 'lucide-react';
import { getTierDetails, round5, getPreviousWeekRange } from '../utils';

const PlayerDashboard = ({ 
  currentUser, viewingUser, players, sessions, withdrawals, isShiftActive,
  onStartShift, onTeamPay, onLogMachine, onCashout, onTransfer, onClaimBonus, onSettleFreelanceTab,
  onEditSession, onDeleteSession, onDeleteWithdrawal, setView 
}) => {
  
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');

  const targetUser = viewingUser || currentUser;
  const isSpectator = !!viewingUser;

  const myStats = players.find(p => p.id === targetUser.id) || targetUser;
  const surplus = myStats.heldCash - myStats.pinnedBankroll;
  const freelanceDebt = myStats.freelanceDebt || 0;
  
  const tier = getTierDetails(myStats.peakScore || myStats.tierScore || myStats.lifetimeProfit, myStats.currentTier);
  const playerShare = round5(surplus * tier.playerKeep);
  const backerShare = surplus - playerShare;

  let statusLabel = surplus > 0 ? "Current Profit" : (surplus < 0 ? "Current Makeup" : "Current Status");

  // --- UPDATED: FREELANCE PERFORMANCE (With Hourly) ---
  const freelanceStats = useMemo(() => {
      let gross = 0;
      let net = 0;
      let hours = 0;

      sessions.forEach(s => {
          if (s.playersInvolved?.includes(targetUser.id) && s.type === 'freelance') {
              const profit = parseFloat(s.totalProfit) || 0;
              const cut = parseFloat(s.backerCut) || 0; 
              const duration = parseFloat(s.duration) || 0;
              
              gross += profit;
              net += (profit - cut);
              hours += duration;
          }
      });

      const hourly = hours > 0 ? (net / hours) : 0;

      return { gross, net, hourly };
  }, [sessions, targetUser.id]);

  // --- WEEKLY BONUS ---
  const bonusData = useMemo(() => {
      const { start, end, id } = getPreviousWeekRange();
      const weeklySessions = sessions.filter(s => {
          if (!s.playersInvolved?.includes(targetUser.id)) return false;
          const sDate = new Date(s.timestamp?.seconds * 1000);
          const inRange = sDate >= start && sDate <= end;
          const isSolo = s.type === 'solo' || s.type === 'freelance' || (!s.type && s.playersInvolved.length === 1);
          return inRange && isSolo;
      });
      const weeklyProfit = weeklySessions.reduce((acc, s) => acc + (parseFloat(s.totalProfit) || 0), 0);
      const sessionCount = weeklySessions.length;
      const bonusAmount = round5(weeklyProfit * 0.15);
      let isEligible = true;
      let reason = "Eligible";
      if (surplus > -3000) { isEligible = false; reason = "Makeup under $3k"; }
      else if (sessionCount < 3) { isEligible = false; reason = `Need 3 Solo Runs (Did ${sessionCount})`; }
      else if (weeklyProfit <= 0) { isEligible = false; reason = "No Net Profit"; }
      else if (myStats.lastBonusClaimDate === id) { isEligible = false; reason = "Already Claimed"; }
      return { isEligible, reason, bonusAmount, sessionCount, weeklyProfit, weekId: id };
  }, [sessions, targetUser.id, surplus, myStats.lastBonusClaimDate]);

  // --- CHART DATA ---
  const chartData = useMemo(() => {
    const mySessions = sessions
      .filter(s => s.playersInvolved && s.playersInvolved.includes(targetUser.id))
      .sort((a,b) => a.timestamp - b.timestamp);
    let runningTotal = 0;
    return mySessions.map(s => { 
        let share = 0;
        if (s.type === 'freelance') {
            share = s.totalProfit - (s.backerCut || 0);
        } else {
            const effectiveProfit = s.papiBacked ? s.totalProfit * 0.5 : s.totalProfit;
            share = effectiveProfit / s.playersInvolved.filter(pid => { const p = players.find(x => x.id === pid); return p && p.role !== 'investor'; }).length;
        }
        runningTotal += share; 
        return { date: new Date(s.timestamp?.seconds * 1000).toLocaleDateString(), profit: runningTotal }; 
    });
  }, [sessions, targetUser.id, players]);

  const history = sessions
    .filter(s => s.playersInvolved && s.playersInvolved.includes(targetUser.id))
    .sort((a,b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  return (
    <div className="space-y-6">
      
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

      {/* --- STATS CARD 1: FREELANCE PERFORMANCE (UPDATED) --- */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 p-4 rounded-xl shadow-lg">
          <h3 className="text-blue-300 font-bold flex items-center gap-2 mb-3"><Briefcase size={18}/> Freelance Performance</h3>
          
          <div className="flex flex-col gap-3">
              {/* Row 1: The Hero Metric (Hourly) */}
              <div className="bg-gray-900/60 p-4 rounded-lg flex justify-between items-center border border-blue-500/20">
                  <div className="flex items-center gap-2 text-gray-300 font-bold">
                      <Clock size={20} className="text-blue-400" /> Net Hourly Rate
                  </div>
                  <div className={`text-3xl font-mono font-bold ${freelanceStats.hourly >= 0 ? 'text-white' : 'text-red-400'}`}>
                      ${Math.round(freelanceStats.hourly)}<span className="text-sm text-gray-500 font-normal">/hr</span>
                  </div>
              </div>

              {/* Row 2: The Totals */}
              <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-900/50 p-3 rounded text-center">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Net Profit</div>
                      <div className={`text-xl font-bold ${freelanceStats.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${freelanceStats.net.toLocaleString()}
                      </div>
                  </div>
                  <div className="bg-gray-900/50 p-3 rounded text-center border-l border-gray-700">
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Gross</div>
                      <div className={`text-lg font-bold ${freelanceStats.gross >= 0 ? 'text-gray-300' : 'text-red-900'}`}>
                          ${freelanceStats.gross.toLocaleString()}
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* --- STATS CARD 2: LEGACY DEBT --- */}
      <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex justify-between items-start relative z-10">
            <div>
                <h2 className="text-2xl font-bold text-white">{myStats.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${tier.color} ${tier.text}`}>
                        {tier.name}
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

        <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-black/20 rounded-lg relative z-10">
            <div><div className="text-xs text-gray-400 mb-1">Old Held Cash</div><div className="text-xl font-mono text-emerald-300">${myStats.heldCash.toLocaleString()}</div></div>
            <div><div className="text-xs text-gray-400 mb-1">Old Debt</div><div className="text-xl font-mono text-blue-300">${myStats.pinnedBankroll.toLocaleString()}</div></div>
        </div>
        
        {/* FREELANCE TAB */}
        <div className="mt-4 p-3 bg-gray-800/80 rounded border border-blue-500/30 flex justify-between items-center relative z-10">
            <div>
                <div className="text-xs text-blue-300 flex items-center gap-1"><Briefcase size={12}/> Current Tab</div>
                <div className={`text-xl font-bold font-mono ${freelanceDebt > 0 ? 'text-blue-400' : (freelanceDebt < 0 ? 'text-emerald-400' : 'text-gray-400')}`}>
                    {freelanceDebt === 0 ? "$0.00" : (freelanceDebt > 0 ? `Owe $${freelanceDebt}` : `Credit $${Math.abs(freelanceDebt)}`)}
                </div>
            </div>
            {freelanceDebt !== 0 && !isSpectator && (
                <button onClick={() => { if(window.confirm("Settle this tab now?")) onSettleFreelanceTab(); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold">
                    Settle Tab
                </button>
            )}
        </div>

        {/* LEGACY ACTIONS */}
        {!isSpectator && (
            <div className="mt-6 border-t border-gray-700 pt-4 flex flex-col gap-2">
                <button onClick={() => setShowTransferModal(true)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2"><ArrowRightLeft size={20} /> Transfer Old Debt</button>
                <button 
                    onClick={() => {
                        if (bonusData.isEligible && window.confirm(`Claim Weekly Bonus of $${bonusData.bonusAmount}?`)) {
                            onClaimBonus(bonusData.bonusAmount, bonusData.weekId);
                        }
                    }}
                    disabled={!bonusData.isEligible}
                    className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold border transition-all ${bonusData.isEligible ? 'bg-purple-600 hover:bg-purple-500 border-purple-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed opacity-60'}`}
                >
                    <Gift size={20} /> {bonusData.isEligible ? `Claim Rebate: $${bonusData.bonusAmount}` : `Bonus: ${bonusData.reason}`}
                </button>
            </div>
        )}
      </div>

      {/* --- RECENT WITHDRAWALS --- */}
      {withdrawals && withdrawals.length > 0 && (
          <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 shadow-lg">
              <h4 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2"><History size={14}/> Settlement History</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {withdrawals.map(w => (
                      <div key={w.id} className="flex justify-between items-center bg-gray-900 p-2 rounded text-xs">
                          <div>
                              <span className="text-gray-300 font-medium block">{w.method}</span>
                              <span className="text-gray-500">{new Date(w.timestamp?.seconds * 1000).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-3">
                              <span className={`font-bold font-mono ${w.amount > 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                                  {w.amount > 0 ? `-$${w.amount}` : `+$${Math.abs(w.amount)}`}
                              </span>
                              {!isSpectator && (
                                <button onClick={() => onDeleteWithdrawal(w.id)} className="text-gray-600 hover:text-red-400 p-1"><Trash2 size={12}/></button>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- QUICK ACTIONS --- */}
      {!isSpectator && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button onClick={() => setView('logTeamSession')} className="bg-blue-900/20 hover:bg-blue-900/40 p-4 rounded-xl border border-blue-500/50 flex flex-col items-center gap-2 transition group"><Users size={24} className="text-blue-400 group-hover:text-blue-300" /><span className="font-bold text-blue-100">Log Team Play</span></button>
            <button onClick={onTeamPay} className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl border border-gray-700 flex flex-col items-center gap-2 transition"><DollarSign size={24} className="text-yellow-500" /><span className="font-bold text-gray-300">Log Team Pay</span></button>
            <button onClick={onLogMachine} className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl border border-gray-700 flex flex-col items-center gap-2 transition"><BarChart2 size={24} className="text-purple-500" /><span className="font-bold text-gray-300">Machine Log</span></button>
            <button onClick={() => setView('playInfo')} className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl border border-gray-700 flex flex-col items-center gap-2 transition"><BookOpen size={24} className="text-cyan-400" /><span className="font-bold text-gray-300">Play Info</span></button>
        </div>
      )}

      {/* --- PROFIT GRAPH --- */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 h-64">
        <h3 className="text-sm text-gray-400 mb-4">Total Net Profit Trend</h3>
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

      {/* --- SESSION HISTORY --- */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700 font-bold flex items-center gap-2"><Activity size={18}/> Session History</div>
        <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-900 text-gray-400">
                    <tr><th className="p-3">Date</th><th className="p-3">Casino</th><th className="p-3 text-right">Result</th>{!isSpectator && <th className="p-3 text-right">Actions</th>}</tr>
                </thead>
                <tbody>
                    {history.map(s => {
                        return (
                            <tr key={s.id} className="border-b border-gray-700">
                                <td className="p-3 text-gray-400"><div>{new Date(s.timestamp?.seconds * 1000).toLocaleDateString()}</div></td>
                                <td className="p-3 font-medium">
                                    {s.casino}
                                    {s.type === 'freelance' && <span className="ml-2 text-[10px] bg-blue-900/50 text-blue-300 px-1 rounded">FREE</span>}
                                </td>
                                <td className={`p-3 text-right font-bold ${s.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {`$${s.totalProfit}`}
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

      {showSettleModal && (<div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"><div className="bg-gray-800 p-6 rounded-xl border border-emerald-500 max-w-sm w-full"><h2 className="text-xl font-bold text-white mb-4">End of Shift</h2><div className="space-y-4 mb-6"><div className="flex justify-between text-gray-400 text-sm"><span>Total Surplus:</span><span className="text-white">${surplus}</span></div><div className="bg-gray-900 p-4 rounded space-y-2"><div className="flex justify-between items-center"><span className="text-emerald-400 font-bold">You Take</span><span className="text-xl font-bold text-emerald-400">${playerShare}</span></div><div className="border-t border-gray-800 my-2"></div><div className="flex justify-between items-center"><span className="text-blue-400">Backer Keeps</span><span className="text-xl font-bold text-blue-400">${backerShare}</span></div></div></div><div className="flex gap-3"><button onClick={() => setShowSettleModal(false)} className="flex-1 bg-gray-700 py-3 rounded text-sm font-bold">Cancel</button><button onClick={() => { onCashout(playerShare, backerShare); setShowSettleModal(false); }} className="flex-1 bg-emerald-600 py-3 rounded text-sm font-bold hover:bg-emerald-500">Confirm</button></div></div></div>)}
      {showTransferModal && (<div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"><div className="bg-gray-800 p-6 rounded-xl border border-blue-500 max-w-sm w-full"><h2 className="text-xl font-bold text-white mb-4">Transfer to Backer</h2><div className="space-y-4 mb-6"><p className="text-sm text-gray-400">Reduce your Cash and Pin by this amount.</p><input type="number" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-xl font-bold text-white" placeholder="5000" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} /></div><div className="flex gap-3"><button onClick={() => setShowTransferModal(false)} className="flex-1 bg-gray-700 py-3 rounded text-sm font-bold">Cancel</button><button onClick={() => { onTransfer(parseFloat(transferAmount)); setShowTransferModal(false); setTransferAmount(''); }} className="flex-1 bg-blue-600 py-3 rounded text-sm font-bold hover:bg-blue-500">Confirm Transfer</button></div></div></div>)}
    </div>
  );
};

export default PlayerDashboard;