import React from 'react';
import { Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getTierDetails, round5 } from '../utils';

const TeamRoster = ({ players, sessions, onViewPlayer }) => (
    <div className="space-y-6">
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><Users className="text-emerald-400" /> Team Status</h2>
        </div>
        <div className="grid grid-cols-1 gap-4">
            {players.filter(p => p.role !== 'backer' && p.role !== 'investor').map(p => {
                 const tier = getTierDetails(p.peakScore || p.tierScore || p.lifetimeProfit, p.currentTier);
                 const surplus = p.heldCash - p.pinnedBankroll;
                 const hourly = (p.lifetimeEarnings || 0) / (p.lifetimeHours || 1);
                 const mySessions = sessions.filter(s => s.playersInvolved?.includes(p.id));
                 const last3 = mySessions.sort((a,b) => b.timestamp - a.timestamp).slice(0,3);
                 const pieData = [{ name: 'Progress', value: tier.progress }, { name: 'Remaining', value: 100 - tier.progress }];
                 
                 let statusLabel = "Status";
                 if (surplus > 0) statusLabel = "Profit";
                 else if (surplus < 0) statusLabel = "Makeup";
                 else statusLabel = "Even";

                 return (
                    <div key={p.id} onClick={() => onViewPlayer(p)} className="bg-gray-800 border border-gray-700 p-4 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex gap-3 items-center">
                                <div className="relative w-12 h-12">
                                    <ResponsiveContainer>
                                        <PieChart><Pie data={pieData} innerRadius={18} outerRadius={24} dataKey="value" startAngle={90} endAngle={-270}><Cell fill="#10B981" /><Cell fill="#374151" /></Pie></PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">{Math.round(tier.progress)}%</div>
                                </div>
                                <div><h3 className="font-bold text-lg">{p.name}</h3><span className={`px-2 py-0.5 rounded text-xs font-bold ${tier.color} ${tier.text}`}>{tier.name}</span></div>
                            </div>
                            <div className="text-right"><div className="text-xs text-gray-500">Hourly</div><div className="font-bold text-white">${Math.round(hourly)}/hr</div></div>
                        </div>
                        <div className="mb-3"><div className="text-xs text-gray-500 mb-1">Recent Activity</div><div className="flex gap-2">{last3.map(s => { const isTeam = s.playersInvolved.length > 1; const val = isTeam ? round5(s.totalProfit/s.playersInvolved.length) : s.totalProfit; return (<div key={s.id} className={`text-xs px-2 py-1 rounded border ${val > 0 ? (isTeam ? 'border-amber-500 text-amber-400' : 'border-emerald-900 bg-emerald-900/20 text-emerald-400') : 'border-red-900 bg-red-900/20 text-red-400'}`}>${val}</div>); })}</div></div>
                        <div className="grid grid-cols-3 gap-2 text-sm bg-gray-900/50 p-2 rounded">
                            <div className="text-center"><div className="text-xs text-gray-500">Tier Score</div><div className="text-white">${(p.peakScore || p.tierScore || 0).toLocaleString()}</div></div>
                            <div className="text-center"><div className="text-xs text-gray-500">Earnings</div><div className="text-emerald-400">${(p.lifetimeEarnings || 0).toLocaleString()}</div></div>
                            <div className="text-center"><div className="text-xs text-gray-500">{statusLabel}</div><div className={`${surplus >= 0 ? 'text-white' : 'text-red-500'}`}>{surplus === 0 ? "Even" : surplus}</div></div>
                        </div>
                    </div>
                 );
            })}
        </div>
    </div>
);

export default TeamRoster;