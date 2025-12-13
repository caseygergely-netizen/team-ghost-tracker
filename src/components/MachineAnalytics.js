import React, { useState, useMemo } from 'react';
import { Database, Filter, BarChart, MapPin, Calendar, Info } from 'lucide-react';
import { calculateSD } from '../utils';
import { Trash2 } from 'lucide-react';

const MachineAnalytics = ({ logs, sessions, onDeleteLog }) => {
    const [viewMode, setViewMode] = useState('machine'); // 'machine' or 'session'
    
    // --- SESSION FILTER STATE ---
    const [selectedCasino, setSelectedCasino] = useState('All');

    // --- MACHINE DATA STATE ---
    const [type, setType] = useState('Phoenix Link');
    const [minRange, setMinRange] = useState('');
    const [maxRange, setMaxRange] = useState('');
    const [minExp, setMinExp] = useState('');
    const [maxExp, setMaxExp] = useState('');
    const [minBounty, setMinBounty] = useState('');
    const [maxBounty, setMaxBounty] = useState('');

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // --- 1. EXTRACT CASINO LIST ---
    const casinoList = useMemo(() => {
        if (!sessions) return [];
        const uniqueCasinos = [...new Set(sessions.map(s => s.casino?.trim()))].filter(Boolean).sort();
        return ['All', ...uniqueCasinos];
    }, [sessions]);

    // --- 2. CALCULATE HEATMAP DATA ---
    const heatmapData = useMemo(() => {
        if (!sessions) return [];

        // Initialize 7x24 Grid
        // grid[dayIndex][hourIndex] = { total: 0, count: 0 }
        const grid = Array(7).fill(null).map(() => 
            Array(24).fill(null).map(() => ({ totalProfit: 0, count: 0 }))
        );

        // Filter Sessions by Casino
        const filteredSessions = selectedCasino === 'All' 
            ? sessions 
            : sessions.filter(s => s.casino === selectedCasino);

        filteredSessions.forEach(s => {
            if (!s.timestamp) return;
            const date = new Date(s.timestamp.seconds * 1000);
            const day = date.getDay(); // 0 (Sun) - 6 (Sat)
            const hour = date.getHours(); // 0 - 23

            grid[day][hour].totalProfit += s.totalProfit;
            grid[day][hour].count += 1;
        });

        return grid;
    }, [sessions, selectedCasino]);

    // --- HELPER: GET COLOR FOR CELL ---
    const getCellColor = (data) => {
        if (data.count === 0) return 'bg-gray-800 border-gray-700 text-gray-700'; // Empty
        const avg = data.totalProfit / data.count;
        
        if (avg > 0) {
            // Greens
            if (avg > 500) return 'bg-emerald-500 border-emerald-400 text-black font-bold';
            if (avg > 100) return 'bg-emerald-600 border-emerald-500 text-white';
            return 'bg-emerald-900/50 border-emerald-700 text-emerald-400';
        } else {
            // Reds
            if (avg < -500) return 'bg-red-600 border-red-500 text-white font-bold';
            if (avg < 0) return 'bg-red-900/50 border-red-700 text-red-400';
            return 'bg-gray-700 border-gray-600 text-gray-300'; // Exactly 0 (Break Even)
        }
    };

    // --- MACHINE FILTER LOGIC (Existing) ---
    const filteredLogs = logs.filter(l => {
        if (l.machineType !== type) return false;
        if (type === 'What the Duck') {
            const exp = parseFloat(l.explodes) || 0;
            const bty = parseFloat(l.bounties) || 0;
            if (minExp && exp < parseFloat(minExp)) return false;
            if (maxExp && exp > parseFloat(maxExp)) return false;
            if (minBounty && bty < parseFloat(minBounty)) return false;
            if (maxBounty && bty > parseFloat(maxBounty)) return false;
            return true;
        }
        if (!minRange && !maxRange) return true;
        let valueToCheck = 0;
        if (type === 'Phoenix Link') valueToCheck = parseFloat(l.startingNum) || 0;
        else if (type === 'World Cruise') valueToCheck = parseFloat(l.count) || 0;
        else if (type === 'Temple Falls') valueToCheck = parseFloat(String(l.count).replace(/[^0-9]/g, '')) || 0;
        
        const min = minRange ? parseFloat(minRange) : -Infinity;
        const max = maxRange ? parseFloat(maxRange) : Infinity;
        return valueToCheck >= min && valueToCheck <= max;
    });

    const count = filteredLogs.length;
    const avgUnitWin = count > 0 ? filteredLogs.reduce((a,b) => a + (parseFloat(b.unitWin)||0), 0) / count : 0;
    const sd = calculateSD(filteredLogs, 'unitWin');

    const renderMachineTab = () => {
        const getDynamicHeaders = () => {
            switch(type) {
                case 'Phoenix Link': return <><th className="p-2">Start #</th><th className="p-2">Bet</th></>;
                case 'World Cruise': return <><th className="p-2">Count</th><th className="p-2">Bet</th></>;
                case 'What the Duck': return <><th className="p-2">Exp/Bty</th><th className="p-2">Bet</th></>;
                case 'Temple Falls': return <><th className="p-2">Count</th><th className="p-2">Bet</th></>;
                default: return <th className="p-2">Bet</th>;
            }
        };
        const renderDynamicData = (l) => {
             const fmtBet = (val) => parseFloat(String(val).replace(/[$,]/g,'')).toFixed(2);
             switch(type) {
                case 'Phoenix Link': return <><td className="p-2">{l.startingNum}</td><td className="p-2">${fmtBet(l.bet)}</td></>;
                case 'World Cruise': return <><td className="p-2">{l.count} <span className="text-[10px] text-gray-500">({l.red}/{l.purple}/{l.green})</span></td><td className="p-2">${fmtBet(l.bet)}</td></>;
                case 'What the Duck': return <><td className="p-2">{l.explodes} / {l.bounties}</td><td className="p-2">${fmtBet(l.bet)}</td></>;
                case 'Temple Falls': return <><td className="p-2">{l.count}</td><td className="p-2">${fmtBet(l.bet)}</td></>;
                default: return <td className="p-2">${fmtBet(l.bet)}</td>;
            }
        };

        return (
            <div className="animate-fade-in">
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {['Phoenix Link', 'World Cruise', 'What the Duck', 'Temple Falls'].map(m => (
                        <button key={m} onClick={() => { setType(m); setMinRange(''); setMaxRange(''); }} className={`px-3 py-1 rounded whitespace-nowrap text-sm font-bold ${type === m ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>{m}</button>
                    ))}
                </div>
                <div className="mb-4 bg-gray-900/50 p-3 rounded border border-gray-600">
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-400 font-bold"><Filter size={12}/> Filter By:</div>
                    {type === 'What the Duck' ? (
                        <div className="grid grid-cols-2 gap-2">
                            <input type="number" placeholder="Min Exp" className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs" value={minExp} onChange={e => setMinExp(e.target.value)} />
                            <input type="number" placeholder="Max Exp" className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs" value={maxExp} onChange={e => setMaxExp(e.target.value)} />
                            <input type="number" placeholder="Min Bounty" className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs" value={minBounty} onChange={e => setMinBounty(e.target.value)} />
                            <input type="number" placeholder="Max Bounty" className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs" value={maxBounty} onChange={e => setMaxBounty(e.target.value)} />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input type="number" placeholder="Min" className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs" value={minRange} onChange={e => setMinRange(e.target.value)} />
                            <span className="text-gray-500">-</span>
                            <input type="number" placeholder="Max" className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs" value={maxRange} onChange={e => setMaxRange(e.target.value)} />
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-900 p-3 rounded text-center"><div className="text-xs text-gray-500">Hands Logged</div><div className="text-xl font-bold text-white">{count}</div></div>
                    <div className="bg-gray-900 p-3 rounded text-center"><div className="text-xs text-gray-500">Avg Unit Win</div><div className={`text-xl font-bold ${avgUnitWin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{avgUnitWin.toFixed(2)}</div></div>
                    <div className="bg-gray-900 p-3 rounded text-center"><div className="text-xs text-gray-500">Std Dev</div><div className="text-xl font-bold text-yellow-400">{sd.toFixed(2)}</div></div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-xs text-gray-400">
                        <thead className="bg-gray-900 text-white sticky top-0"><tr><th className="p-2">Date/Loc</th>{getDynamicHeaders()}<th className="p-2 text-right">Unit Win</th><th className="p-2"></th></tr></thead>
                        <tbody>
                            {filteredLogs.map((l) => (
                                <tr key={l.id} className="border-b border-gray-700 hover:bg-gray-750">
                                    <td className="p-2"><div>{new Date(l.timestamp?.seconds * 1000).toLocaleDateString()}</div><div className="text-[10px] text-gray-500">{l.location}</div></td>
                                    {renderDynamicData(l)}
                                    <td className={`p-2 text-right font-bold ${l.unitWin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{parseFloat(l.unitWin).toFixed(2)}</td>
                                    <td className="p-2 text-right"><button onClick={() => onDeleteLog(l.id)} className="p-1 hover:text-red-400 transition-colors"><Trash2 size={16} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderSessionTab = () => (
        <div className="space-y-6 animate-fade-in">
            
            {/* CASINO FILTER */}
            <div className="bg-gray-900 p-4 rounded-xl border border-blue-500/30">
                <label className="block text-xs text-blue-400 font-bold mb-2 uppercase flex items-center gap-2">
                    <MapPin size={12}/> Filter by Casino
                </label>
                <select 
                    className="w-full bg-gray-800 border border-gray-600 rounded p-3 text-white font-bold"
                    value={selectedCasino}
                    onChange={(e) => setSelectedCasino(e.target.value)}
                >
                    {casinoList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* HEATMAP LEGEND */}
            <div className="flex justify-center items-center gap-4 text-[10px] text-gray-400 bg-black/20 p-2 rounded-lg">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500"></div> High Win</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-900"></div> Win</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-900"></div> Loss</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-600"></div> High Loss</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-800 border border-gray-700"></div> No Data</div>
            </div>

            {/* THE SATURATION GRID (HEATMAP) */}
            <div className="overflow-x-auto pb-4">
                <div className="min-w-[600px]">
                    {/* Header Row (Hours) */}
                    <div className="grid grid-cols-[40px_repeat(24,_1fr)] gap-1 mb-1">
                        <div className="text-[10px] text-gray-500 font-bold flex items-end justify-center">Day</div>
                        {Array.from({length: 24}).map((_, i) => (
                            <div key={i} className="text-[8px] text-gray-500 text-center">{i}</div>
                        ))}
                    </div>

                    {/* Data Rows (Days) */}
                    {heatmapData.map((dayData, dayIndex) => (
                        <div key={dayIndex} className="grid grid-cols-[40px_repeat(24,_1fr)] gap-1 mb-1">
                            {/* Day Label */}
                            <div className="text-[10px] font-bold text-gray-400 flex items-center justify-center bg-gray-900 rounded">
                                {daysOfWeek[dayIndex]}
                            </div>

                            {/* Hour Cells */}
                            {dayData.map((cell, hourIndex) => (
                                <div 
                                    key={hourIndex}
                                    title={`${daysOfWeek[dayIndex]} @ ${hourIndex}:00\nAvg: $${cell.count > 0 ? Math.round(cell.totalProfit/cell.count) : 0}\nVol: ${cell.count}`}
                                    className={`h-8 rounded-sm border flex items-center justify-center text-[8px] transition-all hover:scale-110 hover:z-10 cursor-help ${getCellColor(cell)}`}
                                >
                                    {cell.count > 0 && (
                                        <span>{Math.round(cell.totalProfit / cell.count) > 0 ? '+' : ''}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-700 text-center">
                <div className="text-xs text-gray-400 flex items-center justify-center gap-2">
                    <Info size={14}/> 
                    Tip: Hover over (or tap) a box to see exact profitability for that hour.
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {viewMode === 'machine' ? <Database className="text-purple-400" /> : <BarChart className="text-blue-400" />}
                        Analytics
                    </h2>
                    <div className="flex bg-gray-900 rounded-lg p-1">
                        <button onClick={() => setViewMode('machine')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'machine' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Machine</button>
                        <button onClick={() => setViewMode('session')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'session' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Saturation</button>
                    </div>
                </div>
                
                {viewMode === 'machine' ? renderMachineTab() : renderSessionTab()}
            </div>
        </div>
    );
};

export default MachineAnalytics;