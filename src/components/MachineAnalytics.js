import React, { useState } from 'react';
import { Database, Trash2, Filter } from 'lucide-react';
import { calculateSD } from '../utils';

const MachineAnalytics = ({ logs, onDeleteLog }) => {
    const [type, setType] = useState('Phoenix Link');
    
    // Filters
    const [minRange, setMinRange] = useState('');
    const [maxRange, setMaxRange] = useState('');
    const [minExp, setMinExp] = useState('');
    const [maxExp, setMaxExp] = useState('');
    const [minBounty, setMinBounty] = useState('');
    const [maxBounty, setMaxBounty] = useState('');

    const filteredLogs = logs.filter(l => {
        if (l.machineType !== type) return false;
        
        // WHAT THE DUCK FILTER (2 Variables)
        if (type === 'What the Duck') {
            const exp = parseFloat(l.explodes) || 0;
            const bty = parseFloat(l.bounties) || 0;
            if (minExp && exp < parseFloat(minExp)) return false;
            if (maxExp && exp > parseFloat(maxExp)) return false;
            if (minBounty && bty < parseFloat(minBounty)) return false;
            if (maxBounty && bty > parseFloat(maxBounty)) return false;
            return true;
        }

        // STANDARD FILTER (1 Variable)
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
        <div className="space-y-6">
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><Database className="text-purple-400" /> Machine Analytics</h2>
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {['Phoenix Link', 'World Cruise', 'What the Duck', 'Temple Falls'].map(m => (
                        <button key={m} onClick={() => { setType(m); setMinRange(''); setMaxRange(''); }} className={`px-3 py-1 rounded whitespace-nowrap text-sm font-bold ${type === m ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>{m}</button>
                    ))}
                </div>

                {/* FILTERS */}
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
        </div>
    );
};

export default MachineAnalytics;