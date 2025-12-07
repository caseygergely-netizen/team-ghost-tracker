import React, { useState } from 'react';
import { Plus, Edit2, Trash2, BookOpen } from 'lucide-react';

const PlayInfo = ({ games, onAdd, onEdit, onDelete }) => {
    const [view, setView] = useState('list'); const [form, setForm] = useState({});
    
    // STRICT ALPHABETICAL SORT
    const sortedGames = [...(games || [])].sort((a, b) => a.name.localeCompare(b.name));

    const handleSave = () => { if (!form.name) return; if (form.id) onEdit(form); else onAdd(form); setView('list'); setForm({}); };
    
    if (view === 'form') return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700"><h2 className="text-xl font-bold mb-4 flex items-center gap-2"><BookOpen className="text-blue-400"/> {form.id ? 'Edit Game' : 'Add Game'}</h2><div className="space-y-4"><div><label className="block text-xs text-gray-400 mb-1">Game Name</label><input className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Phoenix Link" /></div><div><label className="block text-xs text-gray-400 mb-1">Notes / Strategy</label><textarea className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white h-32" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Triggers, Max Bet, etc..." /></div><div className="flex gap-2"><button onClick={() => setView('list')} className="flex-1 bg-gray-700 py-2 rounded text-sm">Cancel</button><button onClick={handleSave} className="flex-1 bg-blue-600 py-2 rounded text-sm font-bold">Save</button></div></div></div>
    );
    
    return (
        <div className="space-y-4"><div className="flex justify-between items-center"><h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="text-blue-400"/> Play Info</h2><button onClick={() => { setForm({}); setView('form'); }} className="bg-blue-600 p-2 rounded-full hover:bg-blue-500"><Plus size={20}/></button></div><div className="grid grid-cols-1 gap-3">{sortedGames.length > 0 ? sortedGames.map(g => (<div key={g.id} className="bg-gray-800 border border-gray-700 p-4 rounded-xl"><div className="flex justify-between items-start mb-2"><h3 className="font-bold text-lg text-white">{g.name}</h3><div className="flex gap-2"><button onClick={() => { setForm(g); setView('form'); }} className="text-gray-400 hover:text-blue-400"><Edit2 size={16}/></button><button onClick={() => onDelete(g.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={16}/></button></div></div><p className="text-sm text-gray-400 whitespace-pre-wrap">{g.notes}</p></div>)) : <div className="text-gray-500 text-center py-4">No games found.</div>}</div></div>
    );
};
export default PlayInfo;