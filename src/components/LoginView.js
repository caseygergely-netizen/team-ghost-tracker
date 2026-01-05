import React from 'react';
import { getTierDetails } from '../utils';

const LoginView = ({ players, sessions, onLogin }) => {
    const sortedPlayers = [...players].sort((a, b) => {
        if (a.role === 'backer') return -1; if (b.role === 'backer') return 1;
        if (a.role === 'investor') return -1; if (b.role === 'investor') return 1;
        const scoreA = parseFloat(a.peakScore) || parseFloat(a.tierScore) || 0;
        const scoreB = parseFloat(b.peakScore) || parseFloat(b.tierScore) || 0;
        const tierA = getTierDetails(scoreA).level; const tierB = getTierDetails(scoreB).level;
        return tierB !== tierA ? tierB - tierA : scoreB - scoreA;
    });

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
            <h1 className="text-3xl font-bold text-emerald-400 mb-8 tracking-wider">TEAM GHOST</h1>
            <div className="flex flex-col gap-3 w-full max-w-md">
                {sortedPlayers.map(p => {
                    let style = "bg-gray-800 border-gray-700"; let tierName = "";
                    
                    if (p.role === 'backer') { style = "bg-red-900 text-white border-red-700"; tierName = "BACKER"; }
                    else if (p.role === 'investor') { style = "bg-purple-900 text-white border-purple-700"; tierName = "INVESTOR"; }
                    else { const tier = getTierDetails(p.peakScore || p.tierScore || p.lifetimeProfit); style = `${tier.color} ${tier.text} border-transparent`; tierName = tier.name.toUpperCase(); }
                    
                    return (
                        <button key={p.id} onClick={() => onLogin(p)} className={`p-4 rounded-xl border-2 font-bold text-lg shadow-lg flex justify-between items-center transition-transform active:scale-95 ${style}`}>
                            <span>{p.name}</span>
                            <div className="flex flex-col items-end">
                                <span className="text-xs opacity-80">{tierName}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
export default LoginView;