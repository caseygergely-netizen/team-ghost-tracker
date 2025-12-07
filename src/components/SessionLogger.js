import React, { useState, useEffect } from 'react';
import { TrendingUp, Calculator, MapPin, Ghost } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { getLocalDate } from '../utils';

const SessionLogger = ({ players, currentUser, casinoOptions, onSubmit, onCancel, initialData, activeShiftData }) => {
  const [selectedIds, setSelectedIds] = useState(initialData?.playersInvolved || []);
  const [cashHolderId, setCashHolderId] = useState(initialData?.cashHolderId || '');
  const [useBankrollMode, setUseBankrollMode] = useState(true);
  const [isLegacy, setIsLegacy] = useState(initialData?.isLegacy || false);
  const [papiBacked, setPapiBacked] = useState(initialData?.papiBacked || false);
  const [showCasinoList, setShowCasinoList] = useState(false);
  
  // Default Values
  let initDate = getLocalDate();
  let initStart = '';
  let initEnd = ''; 
  let initCasino = initialData ? initialData.casino : '';
  let initProfit = initialData ? initialData.totalProfit : '';

  // If editing legacy OR ending an active shift
  if (initialData && initialData.timestamp) {
      const d = new Date(initialData.timestamp.seconds * 1000);
      initDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      initStart = d.toTimeString().slice(0,5);
      const e = new Date(d.getTime() + (initialData.duration * 60 * 60 * 1000));
      initEnd = e.toTimeString().slice(0,5);
  } else if (activeShiftData) {
      // PRE-FILL FROM GREEN BAR
      const d = new Date(activeShiftData.startTime);
      const now = new Date();
      initDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      initStart = d.toTimeString().slice(0,5);
      initEnd = now.toTimeString().slice(0,5);
      initCasino = activeShiftData.casino;
  }

  const [formData, setFormData] = useState({ date: initDate, casino: initCasino, startTime: initStart, endTime: initEnd, totalProfit: initProfit, startBankroll: '', endBankroll: '' });

  useEffect(() => {
      if (!initialData && selectedIds.length === 0 && currentUser) setSelectedIds([currentUser.id]);
      if (!initialData && selectedIds.length === 1) { const soloPlayer = players.find(p => p.id === selectedIds[0]); if (soloPlayer) setFormData(prev => ({ ...prev, startBankroll: soloPlayer.heldCash })); }
  }, [selectedIds, players, initialData, currentUser]);

  const togglePlayer = (id) => { setSelectedIds(prev => { const newSelection = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]; if (cashHolderId === id) setCashHolderId(''); return newSelection; }); };
  const calculateProfit = () => { if (formData.startBankroll && formData.endBankroll) { return parseFloat(formData.endBankroll) - parseFloat(formData.startBankroll); } return formData.totalProfit; };
  
  const handleSubmit = (e) => {
    e.preventDefault(); if (selectedIds.length > 1 && !cashHolderId) { alert("Select Cash Holder!"); return; }
    const start = new Date(`${formData.date}T${formData.startTime}`); let end = new Date(`${formData.date}T${formData.endTime}`); if (end < start) end.setDate(end.getDate() + 1);
    const diff = (end - start) / 1000 / 60 / 60; const roundedDuration = Math.round(diff * 100) / 100;
    if (roundedDuration <= 0 && !window.confirm("Duration is 0?")) return;
    const finalProfit = useBankrollMode && selectedIds.length <= 1 ? calculateProfit() : parseFloat(formData.totalProfit);
    onSubmit({ ...formData, totalProfit: finalProfit, duration: roundedDuration, sessionTimestamp: Timestamp.fromDate(start), selectedPlayerIds: selectedIds, cashHolderId: selectedIds.length > 1 ? cashHolderId : selectedIds[0], sessionId: initialData?.id, isLegacy, papiBacked });
  };
  
  const filteredCasinos = casinoOptions.filter(c => c.toLowerCase().includes(formData.casino.toLowerCase())).slice(0, 5);

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><TrendingUp className="text-emerald-400" /> {activeShiftData ? 'End Shift' : (initialData ? 'Edit Session' : 'Log Session')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
            {!activeShiftData && (
                <div className="flex-1 flex items-center gap-2 p-3 bg-gray-900 rounded border border-gray-600">
                    <input type="checkbox" checked={isLegacy} onChange={e => setIsLegacy(e.target.checked)} className="w-5 h-5 accent-emerald-500" />
                    <label className="text-xs text-gray-300 font-bold">Legacy Entry</label>
                </div>
            )}
            <div className="flex-1 flex items-center gap-2 p-3 bg-purple-900/30 rounded border border-purple-500/50">
                <input type="checkbox" checked={papiBacked} onChange={e => setPapiBacked(e.target.checked)} className="w-5 h-5 accent-purple-500" />
                <label className="text-xs text-purple-200 font-bold flex items-center gap-1"><Ghost size={14}/> Papi (50%)</label>
            </div>
        </div>

        <div><label className="block text-sm text-gray-400 mb-2">Who Played?</label><div className="flex flex-wrap gap-2">{players.filter(p => p.role !== 'backer' && p.role !== 'investor').map(p => (<button key={p.id} type="button" onClick={() => togglePlayer(p.id)} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${selectedIds.includes(p.id) ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-300'}`}>{p.name}</button>))}</div></div>
        {selectedIds.length > 1 && (<div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded"><label className="block text-sm text-blue-200 mb-2">Who held the cash?</label><select className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={cashHolderId} onChange={e => setCashHolderId(e.target.value)} required><option value="">Select Cash Holder</option>{players.filter(p => selectedIds.includes(p.id)).map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>)}
        
        <div><label className="block text-sm text-gray-400 mb-1">Date</label><input type="date" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
        
        <div className="relative">
            <label className="block text-sm text-gray-400 mb-1">Casino</label>
            <input className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" required value={formData.casino} onChange={e => setFormData({...formData, casino: e.target.value})} onFocus={() => setShowCasinoList(true)} onBlur={() => setTimeout(() => setShowCasinoList(false), 200)} />
            {showCasinoList && filteredCasinos.length > 0 && (<div className="absolute z-10 w-full bg-gray-800 border border-gray-600 rounded-b mt-1 shadow-xl">{filteredCasinos.map(c => (<button key={c} type="button" onClick={() => setFormData({...formData, casino: c})} className="w-full text-left px-4 py-3 hover:bg-gray-700 border-b border-gray-700 last:border-0 text-white flex items-center gap-2"><MapPin size={14} className="text-emerald-500" /> {c}</button>))}</div>)}
        </div>

        <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-gray-400 mb-1">Start Time</label><input type="time" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} /></div><div><label className="block text-sm text-gray-400 mb-1">End Time</label><input type="time" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} /></div></div>
        
        {selectedIds.length <= 1 && (<div className="flex items-center gap-2 mb-2 p-2 bg-gray-900 rounded"><button type="button" onClick={() => setUseBankrollMode(!useBankrollMode)} className="flex items-center gap-2 text-sm font-bold text-blue-400"><Calculator size={16} /> {useBankrollMode ? "Switch to Profit Input" : "Switch to Bankroll Calculator"}</button></div>)}
        {useBankrollMode && selectedIds.length <= 1 ? (<div className="grid grid-cols-2 gap-4 p-3 bg-blue-900/10 border border-blue-500/30 rounded"><div><label className="block text-xs text-blue-300 mb-1">Start Bankroll</label><input type="number" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={formData.startBankroll} onChange={e => setFormData({...formData, startBankroll: e.target.value})} /></div><div><label className="block text-xs text-blue-300 mb-1">End Bankroll</label><input type="number" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={formData.endBankroll} onChange={e => setFormData({...formData, endBankroll: e.target.value})} /></div><div className="col-span-2 text-right text-sm font-bold text-white">Calculated: ${calculateProfit()}</div></div>) : (<div><label className="block text-sm text-gray-400 mb-1">Total Profit ($)</label><input type="number" className="w-full bg-gray-900 border border-gray-600 rounded p-2 font-bold text-white text-lg" required placeholder="2000 or -500" value={formData.totalProfit} onChange={e => setFormData({...formData, totalProfit: e.target.value})} /></div>)}
        
        <div className="flex gap-3 pt-4"><button type="button" onClick={onCancel} className="flex-1 bg-gray-700 py-3 rounded hover:bg-gray-600">Cancel</button><button type="submit" disabled={selectedIds.length === 0} className="flex-1 bg-emerald-600 py-3 rounded hover:bg-emerald-500 font-bold disabled:opacity-50">{activeShiftData ? 'Save & End Shift' : (initialData ? 'Update' : 'Log Session')}</button></div>
      </form>
    </div>
  );
};
export default SessionLogger;