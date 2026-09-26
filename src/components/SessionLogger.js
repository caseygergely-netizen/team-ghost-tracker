import React, { useState, useEffect } from 'react';
import { Users, Clock, Calculator, MapPin, Calendar, Briefcase, Eye, CheckCircle } from 'lucide-react';
import { parseMoney } from '../utils';

const SessionLogger = ({ players, currentUser, casinoOptions, activeShiftData, initialData, mode, onSubmit, onCancel }) => {
  const isShiftMode = mode === 'shift';
  
  // -- HELPERS --
  const getTimeString = (dateObj) => {
      if (!dateObj) return '';
      return dateObj.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit' });
  };

  const getDateString = (dateObj) => {
      if (!dateObj) return '';
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  // -- STATE INITIALIZATION --
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
          papiBacked: false,
          isFreelance: false,
          backerPercent: 0,
          apPresent: false, 
          foundPlays: true // NEW: Default to true (assume you found plays)
      };

      if (initialData) {
          // EDITING
          const d = new Date(initialData.timestamp.seconds * 1000);
          const endD = new Date(d.getTime() + (initialData.duration * 60 * 60 * 1000));
          
          const rawPct = parseFloat(initialData.backerPercent);
          const safeBackerPercent = !isNaN(rawPct) ? rawPct : 0;

          defaults = {
              ...defaults,
              ...initialData,
              date: getDateString(d),
              startTime: getTimeString(d),
              endTime: getTimeString(endD),
              selectedPlayerIds: initialData.playersInvolved || [currentUser.id],
              papiBacked: initialData.papiBacked || false,
              isFreelance: initialData.type === 'freelance',
              backerPercent: safeBackerPercent,
              apPresent: initialData.apPresent || false,
              foundPlays: initialData.foundPlays !== undefined ? initialData.foundPlays : true // NEW: Load past state
          };
      } else if (activeShiftData && isShiftMode) {
          // ENDING SHIFT
          const startD = new Date(activeShiftData.startTime);
          defaults.date = getDateString(startD);
          defaults.startTime = getTimeString(startD);
          defaults.endTime = getTimeString(new Date()); 
          defaults.casino = activeShiftData.casino;
          defaults.startAmount = currentUser.heldCash || ''; 
          if (activeShiftData.isFreelance) {
              defaults.isFreelance = true;
              const rawActivePct = parseFloat(activeShiftData.backerPercent);
              defaults.backerPercent = !isNaN(rawActivePct) ? rawActivePct : 0; 
          }
      }

      return defaults;
  });

  const [useBankrollMode, setUseBankrollMode] = useState(false); 

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
    let finalDuration = 0;
    let sessionTimestamp = new Date();

    if (isShiftMode) {
        const start = new Date(`${formData.date}T${formData.startTime}:00`);
        let end = new Date(`${formData.date}T${formData.endTime}:00`);
        
        if (end < start) end.setDate(end.getDate() + 1);

        const diffMs = end - start;
        finalDuration = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
        sessionTimestamp = start;
    }

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
      type: isShiftMode ? (formData.isFreelance ? 'freelance' : 'solo') : 'team'
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
        
        {isShiftMode && (
            <div className="bg-gray-900 p-4 rounded border border-gray-700 space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-gray-700">
                    <label className="text-sm font-bold text-white flex items-center gap-2">
                        <Briefcase size={16} className={formData.isFreelance ? "text-blue-400" : "text-gray-500"} />
                        Freelance Session?
                    </label>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" className="w-5 h-5 accent-blue-500" checked={formData.isFreelance} onChange={e => handleChange('isFreelance', e.target.checked)} />
                    </div>
                </div>
                {formData.isFreelance && (
                    <div className="bg-blue-900/20 p-2 rounded border border-blue-500/50">
                        <label className="block text-xs text-blue-300 mb-1">Backer Cut (%)</label>
                        <input type="number" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-bold" value={formData.backerPercent} onChange={e => handleChange('backerPercent', e.target.value)} />
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Calendar size={12}/> Date</label><input type="date" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" value={formData.date} onChange={e => handleChange('date', e.target.value)} /></div>
                    <div><label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><MapPin size={12}/> Casino</label><input list="casinos" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" value={formData.casino} onChange={e => handleChange('casino', e.target.value)} /><datalist id="casinos">{casinoOptions.map(c => <option key={c} value={c} />)}</datalist></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs text-gray-400 mb-1">Start Time</label><input type="time" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" value={formData.startTime} onChange={e => handleChange('startTime', e.target.value)} /></div>
                    <div><label className="block text-xs text-gray-400 mb-1">End Time</label><input type="time" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" value={formData.endTime} onChange={e => handleChange('endTime', e.target.value)} /></div>
                </div>
            </div>
        )}

        {!isShiftMode && (
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <label className="block text-xs text-gray-400 mb-2">Who Played?</label>
            <div className="flex flex-wrap gap-2 mb-4">
               {activePlayers.map(p => (
                 <button key={p.id} type="button" onClick={() => togglePlayer(p.id)} className={`px-3 py-1 rounded text-xs font-bold border ${formData.selectedPlayerIds.includes(p.id) ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>{p.name}</button>
               ))}
            </div>
            {formData.selectedPlayerIds.length > 1 && (
                <div className="mb-4">
                    <label className="block text-xs text-blue-300 mb-1">Who held the cash?</label>
                    <select className="w-full bg-gray-800 border border-blue-500/50 rounded p-2 text-white text-sm" value={formData.cashHolderId} onChange={e => handleChange('cashHolderId', e.target.value)}>{players.filter(p => formData.selectedPlayerIds.includes(p.id)).map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}</select>
                </div>
            )}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
              <input type="checkbox" id="papi" checked={formData.papiBacked} onChange={e => handleChange('papiBacked', e.target.checked)} className="w-4 h-4 rounded bg-gray-700 border-gray-500 accent-purple-500" />
              <label htmlFor="papi" className="text-sm text-gray-300">Papi (Ghost) 50%</label>
            </div>
          </div>
        )}

        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                {/* AP PRESENT TOGGLE */}
                <div className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${formData.apPresent ? 'bg-red-900/20 border-red-500/50' : 'bg-gray-900 border-gray-700'}`} onClick={() => handleChange('apPresent', !formData.apPresent)}>
                    <label className="text-xs font-bold text-white flex items-center gap-1 cursor-pointer">
                        <Eye size={14} className={formData.apPresent ? "text-red-400" : "text-gray-500"} />
                        AP Present?
                    </label>
                    <input type="checkbox" className="w-5 h-5 accent-red-500 cursor-pointer pointer-events-none" checked={formData.apPresent} readOnly />
                </div>

                {/* FOUND PLAYS TOGGLE */}
                <div className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${!formData.foundPlays ? 'bg-orange-900/20 border-orange-500/50' : 'bg-gray-900 border-gray-700'}`} onClick={() => handleChange('foundPlays', !formData.foundPlays)}>
                    <label className="text-xs font-bold text-white flex items-center gap-1 cursor-pointer">
                        <CheckCircle size={14} className={!formData.foundPlays ? "text-orange-400" : "text-gray-500"} />
                        Found Plays?
                    </label>
                    <input type="checkbox" className="w-5 h-5 accent-emerald-500 cursor-pointer pointer-events-none" checked={formData.foundPlays} readOnly />
                </div>
            </div>

            {isShiftMode && (
                <div className="flex justify-end mb-2">
                    <button type="button" onClick={() => setUseBankrollMode(!useBankrollMode)} className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"><Calculator size={14}/> {useBankrollMode ? "Switch to Manual Profit" : "Switch to Start/End Calc"}</button>
                </div>
            )}
            {useBankrollMode && isShiftMode ? (
                <div className="bg-gray-900 p-4 rounded border border-blue-500/30 grid grid-cols-2 gap-4">
                    <div><label className="block text-xs text-blue-200 mb-1">Start Bankroll</label><input type="number" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono" value={formData.startAmount} onChange={e => handleChange('startAmount', e.target.value)} /></div>
                    <div><label className="block text-xs text-blue-200 mb-1">End Bankroll</label><input type="number" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white font-mono" value={formData.endAmount} onChange={e => handleChange('endAmount', e.target.value)} /></div>
                    <div className="col-span-2 text-right border-t border-gray-700 pt-2"><span className="text-xs text-gray-500 mr-2">Calculated Profit:</span><span className={`font-bold font-mono ${calculateProfit() >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${calculateProfit()}</span></div>
                </div>
            ) : (
                <div className="bg-gray-900 p-4 rounded border border-gray-600">
                    <label className="block text-xs text-emerald-400 font-bold mb-1">TOTAL Profit ($)</label>
                    <input type="number" className="w-full bg-gray-800 border border-emerald-600 rounded p-3 text-xl font-bold text-white font-mono" placeholder="e.g. 200 or -50" value={formData.totalProfit} onChange={e => handleChange('totalProfit', e.target.value)} />
                </div>
            )}
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 bg-gray-700 py-3 rounded font-bold text-gray-300 hover:bg-gray-600">Cancel</button>
          <button type="submit" className="flex-1 bg-emerald-600 py-3 rounded font-bold text-white hover:bg-emerald-500">{initialData ? "Update Session" : (isShiftMode ? "Confirm & End Shift" : "Log Team Play")}</button>
        </div>
      </form>
    </div>
  );
};

export default SessionLogger;