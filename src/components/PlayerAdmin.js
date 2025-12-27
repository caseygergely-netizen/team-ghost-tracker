import React, { useState } from 'react';
import { Settings, Save, Trash2, Upload, Database } from 'lucide-react';
import { doc, updateDoc, writeBatch, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { parseMoney } from '../utils';

const PlayerAdmin = ({ players }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [importText, setImportText] = useState('');
  
  // --- PLAYER EDIT LOGIC ---
  const startEdit = (player) => { setEditingId(player.id); setEditForm({ ...player }); };
  
  const saveEdit = async () => {
      const cleanData = {
          peakScore: parseFloat(editForm.peakScore) || 0,
          tierScore: parseFloat(editForm.tierScore) || 0,
          lifetimeEarnings: parseFloat(editForm.lifetimeEarnings) || 0,
          lifetimeHours: parseFloat(editForm.lifetimeHours) || 0,
          heldCash: parseFloat(editForm.heldCash) || 0,
          pinnedBankroll: parseFloat(editForm.pinnedBankroll) || 0,
          currentTier: parseInt(editForm.currentTier) || 0,
          investorBalance: parseFloat(editForm.investorBalance) || 0
      };
      try {
          await updateDoc(doc(db, "players", editingId), cleanData);
          setEditingId(null);
      } catch(e) { alert("Error saving stats"); }
  };

  // --- BULK IMPORT LOGIC (Moved from App.js) ---
  const handleBulkImport = async (type) => {
      if(!importText) return alert("Paste data first");
      const batch = writeBatch(db); 
      let count = 0;
      
      importText.trim().split('\n').forEach(row => {
          const c = row.split(/\t|,/);
          let d = { machineType: type, timestamp: serverTimestamp(), imported: true };
          
          // Parsing Logic per type
          if (type === 'Phoenix Link') { d = { ...d, denom: c[0], bet: c[1], startingNum: c[2], moneyIn: c[3], moneyOut: c[4], location: c[5] }; } 
          else if (type === 'World Cruise') { d = { ...d, denom: c[0], bet: c[1], red: c[2], purple: c[3], green: c[4], count: c[5], moneyIn: c[6], moneyOut: c[7], location: c[8] }; } 
          else if (type === 'What the Duck') { d = { ...d, bet: c[0], explodes: c[1], bounties: c[2], moneyIn: c[3], moneyOut: c[4], location: 'Imported' }; } 
          else if (type === 'Temple Falls') { d = { ...d, bet: c[0], count: c[1], moneyIn: c[2], moneyOut: c[3], location: 'Imported' }; }
          
          const cin = parseMoney(d.moneyIn); 
          const cout = parseMoney(d.moneyOut); 
          const betVal = parseMoney(d.bet) || 1;
          d.unitWin = (cout - cin) / betVal; 
          
          batch.set(doc(collection(db, "machineLogs")), d); 
          count++;
      });
      
      try { await batch.commit(); alert(`Imported ${count} logs.`); setImportText(''); } 
      catch(e) { alert("Import Failed"); }
  };

  // --- CLEAR LOGS LOGIC (Moved from App.js) ---
  const handleClearImports = async (type) => { 
      if(!window.confirm(`Delete ONLY imported logs for ${type}?`)) return; 
      const q = query(collection(db, "machineLogs"), where("machineType", "==", type), where("imported", "==", true)); 
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      alert("Imported logs cleared."); 
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Settings className="text-gray-400" /> Admin Settings</h2>
      
      <div className="space-y-4">
          {/* PLAYER LIST */}
          {players.map(p => (
              <div key={p.id} className="bg-gray-900 p-4 rounded border border-gray-700">
                  {editingId === p.id ? (
                      <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {p.role === 'investor' ? (
                                  <>
                                    <div className="col-span-2"><label className="text-xs text-purple-400 block mb-1">Investor Balance</label><input type="number" className="w-full bg-gray-800 border border-purple-500 rounded px-2 py-2 text-white" value={editForm.investorBalance} onChange={e => setEditForm({...editForm, investorBalance: e.target.value})} /></div>
                                    <div><label className="text-xs text-gray-500 block mb-1">Lifetime Earnings</label><input type="number" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-white" value={editForm.lifetimeEarnings} onChange={e => setEditForm({...editForm, lifetimeEarnings: e.target.value})} /></div>
                                  </>
                              ) : (
                                  <>
                                    <div><label className="text-xs text-gray-500 block mb-1">Tier Score</label><input type="number" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-white" value={editForm.tierScore} onChange={e => setEditForm({...editForm, tierScore: e.target.value})} /></div>
                                    <div><label className="text-xs text-gray-500 block mb-1">Earnings</label><input type="number" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-white" value={editForm.lifetimeEarnings} onChange={e => setEditForm({...editForm, lifetimeEarnings: e.target.value})} /></div>
                                    <div><label className="text-xs text-yellow-500/80 block mb-1">Peak Score</label><input type="number" className="w-full bg-gray-800 border border-yellow-500/50 rounded px-2 py-2 text-white" value={editForm.peakScore} onChange={e => setEditForm({...editForm, peakScore: e.target.value})} /></div>
                                    <div><label className="text-xs text-gray-500 block mb-1">Hours</label><input type="number" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-white" value={editForm.lifetimeHours} onChange={e => setEditForm({...editForm, lifetimeHours: e.target.value})} /></div>
                                    <div><label className="text-xs text-emerald-500/80 block mb-1">Held Cash</label><input type="number" className="w-full bg-gray-800 border border-emerald-500/50 rounded px-2 py-2 text-white" value={editForm.heldCash} onChange={e => setEditForm({...editForm, heldCash: e.target.value})} /></div>
                                    <div><label className="text-xs text-blue-400/80 block mb-1">Pinned</label><input type="number" className="w-full bg-gray-800 border border-blue-500/50 rounded px-2 py-2 text-white" value={editForm.pinnedBankroll} onChange={e => setEditForm({...editForm, pinnedBankroll: e.target.value})} /></div>
                                  </>
                              )}
                          </div>
                          <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
                              <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm bg-gray-700 rounded hover:bg-gray-600">Cancel</button>
                              <button onClick={saveEdit} className="px-4 py-2 text-sm bg-emerald-600 rounded flex items-center gap-1 font-bold hover:bg-emerald-500"><Save size={16} /> Save</button>
                          </div>
                      </div>
                  ) : (
                      <div className="flex justify-between items-center">
                          <div>
                              <h3 className="font-bold text-lg text-white">{p.name}</h3>
                              <div className="text-xs text-gray-400 mt-1">{p.role === 'investor' ? 'Investor' : `Tier Score: $${(p.tierScore || 0).toLocaleString()}`}</div>
                          </div>
                          <button onClick={() => startEdit(p)} className="text-emerald-400 text-sm font-bold border border-emerald-900 bg-emerald-900/20 px-3 py-1 rounded hover:bg-emerald-900/40">Edit</button>
                      </div>
                  )}
              </div>
          ))}

          {/* NEW: SYSTEM ACTIONS SECTION */}
          <div className="bg-black/30 p-4 rounded border border-gray-700 mt-8">
              <h3 className="font-bold text-gray-300 mb-4 flex items-center gap-2"><Database size={16}/> Bulk Actions</h3>
              <textarea 
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-xs font-mono h-24 mb-2" 
                  placeholder="Paste CSV/TSV data here..."
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleBulkImport('Phoenix Link')} className="bg-purple-900/50 border border-purple-500 text-purple-200 px-3 py-1 rounded text-xs flex items-center gap-1"><Upload size={12}/> Import Phoenix</button>
                  <button onClick={() => handleBulkImport('World Cruise')} className="bg-blue-900/50 border border-blue-500 text-blue-200 px-3 py-1 rounded text-xs flex items-center gap-1"><Upload size={12}/> Import Cruise</button>
                  <div className="flex-1"></div>
                  <button onClick={() => handleClearImports('Phoenix Link')} className="bg-red-900/50 border border-red-500 text-red-200 px-3 py-1 rounded text-xs flex items-center gap-1"><Trash2 size={12}/> Clear Phoenix</button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default PlayerAdmin;