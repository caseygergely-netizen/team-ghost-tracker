import React, { useState, useEffect } from 'react';
import { Users, Clock, Calculator, Lock, Play } from 'lucide-react';
import { parseMoney } from '../utils';
import { Timestamp } from 'firebase/firestore';

const SessionLogger = ({ players, currentUser, casinoOptions, activeShiftData, mode, onSubmit, onCancel }) => {
  const isShiftEnd = mode === 'shift';
  
  // -- STATE --
  const [formData, setFormData] = useState({
    totalProfit: '',
    startAmount: '', 
    endAmount: '',
    selectedPlayerIds: [currentUser.id],
    cashHolderId: currentUser.id,
    papiBacked: false
  });

  // Toggle for "Calculator Mode" (Only for Shift End)
  const [useBankrollMode, setUseBankrollMode] = useState(isShiftEnd); 

  // -- INITIALIZATION EFFECT --
  useEffect(() => {
    // If ending a shift, auto-populate the "Start Amount" with current Held Cash
    // BUT only if the field is empty (don't overwrite if user typed)
    if (isShiftEnd && !formData.startAmount && currentUser) {
        setFormData(prev => ({ ...prev, startAmount: currentUser.heldCash }));
    }
  }, [isShiftEnd, currentUser]);

  // -- HANDLERS --
  const handleChange = (f, v) => setFormData(prev => ({ ...prev, [f]: v }));

  const togglePlayer = (pid) => {
    const current = formData.selectedPlayerIds;
    const newIds = current.includes(pid) 
      ? current.filter(id => id !== pid)
      : [...current, pid];
    handleChange('selectedPlayerIds', newIds);
  };

  const calculateProfit = () => {
      const start = parseMoney(formData.startAmount);
      const end = parseMoney(formData.endAmount);
      return end - start;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 1. Determine Profit
    let finalProfit = 0;
    if (isShiftEnd && useBankrollMode) {
        finalProfit = calculateProfit();
    } else {
        finalProfit = parseMoney(formData.totalProfit);
    }

    // 2. Determine Duration (Auto-calc for Shift, 0 for Team)
    let finalDuration = 0;
    let sessionTimestamp = new Date();

    if (isShiftEnd && activeShiftData) {
        const start = new Date(activeShiftData.startTime);
        const now = new Date();
        const diffMs = now - start;
        finalDuration = diffMs / (1000 * 60 * 60); // Convert ms to hours
        sessionTimestamp = start; // Session is logged at start time of shift
    }

    onSubmit({
      ...formData,
      totalProfit: finalProfit,
      duration: finalDuration,
      sessionTimestamp,
      casino: activeShiftData?.casino || '', // Auto-filled from shift
      game: isShiftEnd ? 'Shift' : 'Team Play',
      type: isShiftEnd ? 'solo' : 'team' // Backend override logic handles this too
    });
  };

  const activePlayers = players.filter(p => !['backer', 'investor'].includes(p.role));

  // -- RENDER HELPERS --
  const renderShiftHeader = () => {
      if (!activeShiftData) return null;
      const start = new Date(activeShiftData.startTime);
      return (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
                <span className="text-gray-500 block text-xs">Casino</span>
                <span className="font-bold text-white flex items-center gap-2"><Lock size={12} className="text-emerald-500"/> {activeShiftData.casino}</span>
            </div>
            <div>
                <span className="text-gray-500 block text-xs">Date</span>
                <span className="font-bold text-white">{start.toLocaleDateString()}</span>
            </div>
            <div>
                <span className="text-gray-500 block text-xs">Start Time</span>
                <span className="font-bold text-white">{start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div>
                <span className="text-gray-500 block text-xs">End Time</span>
                <span className="font-bold text-white text-emerald-400">Now</span>
            </div>
        </div>
      );
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-6 text-emerald-400 flex items-center gap-2">
        {isShiftEnd ? <Clock /> : <Users />} 
        {isShiftEnd ? "End Shift" : "Log Team Play"}
      </h2>

      {isShiftEnd && renderShiftHeader()}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* --- TEAM MODE: PLAYER SELECTION --- */}
        {!isShiftEnd && (
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <label className="block text-xs text-gray-400 mb-2">Who Played?</label>
            <div className="flex flex-wrap gap-2 mb-4">
               {activePlayers.map(p => (
                 <button 
                   key={p.id}
                   type="button"
                   onClick={() => togglePlayer(p.id)}
                   className={`px-3 py-1 rounded text-xs font-bold border ${formData.selectedPlayerIds.includes(p.id) ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                 >
                   {p.name}
                 </button>
               ))}
            </div>
            
            {/* Cash Holder Logic */}
            {formData.selectedPlayerIds.length > 1 && (
                <div className="mb-4">
                    <label className="block text-xs text-blue-300 mb-1">Who held the cash?</label>
                    <select 
                        className="w-full bg-gray-800 border border-blue-500/50 rounded p-2 text-white text-sm"
                        value={formData.cashHolderId}
                        onChange={e => handleChange('cashHolderId', e.target.value)}
                    >
                        {players.filter(p => formData.selectedPlayerIds.includes(p.id)).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Papi Toggle */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
              <input 
                type="checkbox" 
                id="papi" 
                checked={formData.papiBacked} 
                onChange={e => handleChange('papiBacked', e.target.checked)}
                className="w-4 h-4 rounded bg-gray-700 border-gray-500 accent-purple-500"
              />
              <label htmlFor="papi" className="text-sm text-gray-300">Papi (Ghost) 50%</label>
            </div>
          </div>
        )}

        {/* --- MONEY INPUTS --- */}
        <div>
            {/* Toggle Button (Only for Shift) */}
            {isShiftEnd && (
                <div className="flex justify-end mb-2">
                    <button 
                        type="button" 
                        onClick={() => setUseBankrollMode(!useBankrollMode)} 
                        className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300"
                    >
                        <Calculator size={14}/> {useBankrollMode ? "Switch to Total Profit" : "Switch to Start/End Calculator"}
                    </button>
                </div>
            )}

            {/* Input Fields */}
            {useBankrollMode && isShiftEnd ? (
                <div className="bg-gray-900 p-4 rounded border border-blue-500/30 grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-blue-200 mb-1">Start Bankroll</label>
                        <input type="number" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono" value={formData.startAmount} onChange={e => handleChange('startAmount', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs text-blue-200 mb-1">End Bankroll</label>
                        <input type="number" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono" value={formData.endAmount} onChange={e => handleChange('endAmount', e.target.value)} />
                    </div>
                    <div className="col-span-2 text-right border-t border-gray-700 pt-2">
                        <span className="text-xs text-gray-500 mr-2">Calculated Profit:</span>
                        <span className={`font-bold font-mono ${calculateProfit() >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${calculateProfit()}</span>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-900 p-4 rounded border border-gray-600">
                    <label className="block text-xs text-emerald-400 font-bold mb-1">TOTAL Profit ($)</label>
                    <input 
                        type="number" 
                        className="w-full bg-gray-800 border border-emerald-600 rounded p-3 text-xl font-bold text-white font-mono" 
                        placeholder="e.g. 200 or -50"
                        value={formData.totalProfit} 
                        onChange={e => handleChange('totalProfit', e.target.value)} 
                    />
                </div>
            )}
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 bg-gray-700 py-3 rounded font-bold text-gray-300 hover:bg-gray-600">Cancel</button>
          <button type="submit" className="flex-1 bg-emerald-600 py-3 rounded font-bold text-white hover:bg-emerald-500">
            {isShiftEnd ? "Confirm & End Shift" : "Log Team Play"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SessionLogger;