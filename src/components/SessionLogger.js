import React, { useState, useEffect } from 'react';
import { Users, Clock, Calculator, MapPin, Calendar, Play } from 'lucide-react';
import { parseMoney } from '../utils';
import { Timestamp } from 'firebase/firestore';

const SessionLogger = ({ players, currentUser, casinoOptions, activeShiftData, initialData, mode, onSubmit, onCancel }) => {
  const isShiftMode = mode === 'shift';
  
  // -- HELPER: Get HH:MM string from date --
  const getTimeString = (dateObj) => {
      if (!dateObj) return '';
      return dateObj.toTimeString().slice(0, 5); // "14:30"
  };

  // -- HELPER: Get YYYY-MM-DD string --
  const getDateString = (dateObj) => {
      if (!dateObj) return '';
      return dateObj.toISOString().split('T')[0];
  };

  // -- INITIALIZE STATE --
  // We determine defaults based on whether we are Editing, Ending a Shift, or Starting fresh.
  const [formData, setFormData] = useState(() => {
      let defaults = {
          date: getDateString(new Date()),
          startTime: getTimeString(new Date()),
          endTime: getTimeString(new Date()),
          casino: '',
          totalProfit: '',
          startAmount: '',
          endAmount: '',
          selectedPlayerIds: [currentUser.id],
          cashHolderId: currentUser.id,
          papiBacked: false
      };

      if (initialData) {
          // EDITING AN OLD SESSION
          const d = new Date(initialData.timestamp.seconds * 1000);
          const endD = new Date(d.getTime() + (initialData.duration * 60 * 60 * 1000));
          
          defaults = {
              ...defaults,
              ...initialData,
              date: getDateString(d),
              startTime: getTimeString(d),
              endTime: getTimeString(endD),
              selectedPlayerIds: initialData.playersInvolved || [currentUser.id],
              papiBacked: initialData.papiBacked || false,
          };
      } else if (activeShiftData && isShiftMode) {
          // ENDING ACTIVE SHIFT
          const startD = new Date(activeShiftData.startTime);
          defaults.date = getDateString(startD);
          defaults.startTime = getTimeString(startD);
          defaults.endTime = getTimeString(new Date()); // Now
          defaults.casino = activeShiftData.casino;
          defaults.startAmount = currentUser.heldCash || ''; // Auto-fill current held cash
      }

      return defaults;
  });

  // Toggle for "Calculator Mode" (Defaults to TRUE if it's a shift, FALSE if team play)
  const [useBankrollMode, setUseBankrollMode] = useState(isShiftMode); 

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
    
    // 1. Calculate Duration from Times
    let finalDuration = 0;
    let sessionTimestamp = new Date(); // Default to now

    if (isShiftMode) {
        const start = new Date(`${formData.date}T${formData.startTime}`);
        let end = new Date(`${formData.date}T${formData.endTime}`);
        
        // Handle overnight shifts (if End Time is earlier than Start Time, assume next day)
        if (end < start) {
            end.setDate(end.getDate() + 1);
        }

        const diffMs = end - start;
        finalDuration = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0; // Hours
        sessionTimestamp = start;
    }

    // 2. Calculate Profit
    let finalProfit = 0;
    if (useBankrollMode && isShiftMode) {
        finalProfit = calculateProfit();
    } else {
        finalProfit = parseMoney(formData.totalProfit);
    }

    onSubmit({
      ...formData,
      totalProfit: finalProfit,
      duration: finalDuration,
      sessionTimestamp,
      type: isShiftMode ? 'solo' : 'team'
    });
  };

  const activePlayers = players.filter(p => !['backer', 'investor'].includes(p.role));

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-6 text-emerald-400 flex items-center gap-2">
        {isShiftMode ? <Clock /> : <Users />} 
        {initialData ? "Edit Session" : (isShiftMode ? "End Shift" : "Log Team Play")}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* --- SHIFT DETAILS (Date/Time/Casino) --- */}
        {isShiftMode && (
            <div className="bg-gray-900 p-4 rounded border border-gray-700 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Calendar size={12}/> Date</label>
                        <input type="date" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" value={formData.date} onChange={e => handleChange('date', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><MapPin size={12}/> Casino</label>
                        <input list="casinos" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" value={formData.casino} onChange={e => handleChange('casino', e.target.value)} />
                        <datalist id="casinos">{casinoOptions.map(c => <option key={c} value={c} />)}</datalist>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Start Time</label>
                        <input type="time" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" value={formData.startTime} onChange={e => handleChange('startTime', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">End Time</label>
                        <input type="time" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" value={formData.endTime} onChange={e => handleChange('endTime', e.target.value)} />
                    </div>
                </div>
            </div>
        )}

        {/* --- TEAM DETAILS (Players) --- */}
        {!isShiftMode && (
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

        {/* --- MONEY INPUTS (Calculator vs Profit) --- */}
        <div>
            {/* Toggle Button */}
            <div className="flex justify-end mb-2">
                <button 
                    type="button" 
                    onClick={() => setUseBankrollMode(!useBankrollMode)} 
                    className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                >
                    <Calculator size={14}/> {useBankrollMode ? "Switch to Manual Profit" : "Switch to Start/End Calc"}
                </button>
            </div>

            {useBankrollMode ? (
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
            {initialData ? "Update Session" : (isShiftMode ? "Confirm & End Shift" : "Log Team Play")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SessionLogger;