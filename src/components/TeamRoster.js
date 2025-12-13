import React, { useMemo } from 'react';
import { Users, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getTierDetails, round5 } from '../utils';

const TeamRoster = ({ players, sessions, onViewPlayer }) => {
    
    // --- TEAM GRAPH DATA ---
    const teamGraphData = useMemo(() => {
        const sortedSessions = [...sessions].sort((a,b) => a.timestamp?.seconds - b.timestamp?.seconds);
        let runningTotal = 0;
        return sortedSessions.map(s => {
            runningTotal += s.totalProfit;
            return {
                date: new Date(s.timestamp?.seconds * 1000).toLocaleDateString(),
                profit: runningTotal
            };
        });
    }, [sessions]);

    const totalTeamProfit = teamGraphData.length > 0 ? teamGraphData[teamGraphData.length - 1].profit : 0;

    return (
        <div className="space-y-6">
            
            {/* --- TEAM BANKROLL GRAPH --- */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h2 className="text-gray-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp size={16} className="text-emerald-400"/> Team Bankroll
                        </h2>
                        <div className={`text-3xl font-mono font-bold ${totalTeamProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ${totalTeamProfit.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="h-48 w-full">
                    
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={teamGraphData}>
                            <defs>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis dataKey="date" hide />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                                itemStyle={{ color: '#10B981' }}
                                formatter={(value) => [`$${value.toLocaleString()}`, 'Total Profit']}
                                labelStyle={{ color: '#9CA3AF' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="profit" 
                                stroke="#10B981" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorProfit)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* --- PLAYER CARDS --- */}
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2"><Users className="text-blue-400" /> Roster</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {players.filter(p => p.role !== 'backer' && p.role !== 'investor').map(p => {
                    const tier = getTierDetails(p.peakScore || p.tierScore || p.lifetimeProfit, p.currentTier);
                    const surplus = p.heldCash - p.pinnedBankroll;
                    const hourly = (p.lifetimeEarnings || 0) / (p.lifetimeHours || 1);
                    const mySessions = sessions.filter(s => s.playersInvolved?.includes(p.id));
                    const last3 = mySessions.sort((a,b) => b.timestamp - a.timestamp).slice(0,3);
                    
                    let statusLabel = "Status";
                    if (surplus > 0) statusLabel = "Profit";
                    else if (surplus < 0) statusLabel = "Makeup";
                    else statusLabel = "Even";

                    return (
                        <div key={p.id} onClick={() => onViewPlayer(p)} className="bg-gray-800 border border-gray-700 p-4 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-3 items-center">
                                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-lg font-bold text-gray-400 border border-gray-600">
                                        {p.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white">{p.name}</h3>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${tier.color} ${tier.text}`}>{tier.name}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500">Hourly</div>
                                    <div className="font-bold text-white">${Math.round(hourly)}/hr</div>
                                </div>
                            </div>
                            <div className="mb-3">
                                <div className="text-xs text-gray-500 mb-1">Recent Activity</div>
                                <div className="flex gap-2">
                                    {last3.map(s => { 
                                        const isTeam = s.playersInvolved.length > 1; 
                                        const val = isTeam ? round5(s.totalProfit/s.playersInvolved.length) : s.totalProfit; 
                                        return (<div key={s.id} className={`text-xs px-2 py-1 rounded border ${val > 0 ? (isTeam ? 'border-amber-500 text-amber-400' : 'border-emerald-900 bg-emerald-900/20 text-emerald-400') : 'border-red-900 bg-red-900/20 text-red-400'}`}>${val}</div>); 
                                    })}
                                </div>
                            </div>
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
};

export default TeamRoster;