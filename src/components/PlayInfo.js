import React, { useState } from 'react';
import { Plus, Edit2, Trash2, BookOpen, Search, X } from 'lucide-react';

const PlayInfo = ({ games, onAdd, onEdit, onDelete }) => {
    const [view, setView] = useState('list'); 
    const [form, setForm] = useState({});
    const [searchTerm, setSearchTerm] = useState(''); // NEW: Search State
    
    // FILTER & SORT LOGIC
    const filteredGames = (games || [])
        .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())) // Filter by search
        .sort((a, b) => a.name.localeCompare(b.name)); // Sort Alphabetically

    const handleSave = () => { 
        if (!form.name) return; 
        if (form.id) onEdit(form); 
        else onAdd(form); 
        setView('list'); 
        setForm({}); 
    };
    
    // --- FORM VIEW (Edit/Add) ---
    if (view === 'form') return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 animate-fade-in">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BookOpen className="text-blue-400"/> {form.id ? 'Edit Game' : 'Add Game'}
            </h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Game Name</label>
                    <input 
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-blue-500 outline-none" 
                        value={form.name || ''} 
                        onChange={e => setForm({...form, name: e.target.value})} 
                        placeholder="e.g. Phoenix Link" 
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Notes / Strategy</label>
                    <textarea 
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white h-32 focus:border-blue-500 outline-none" 
                        value={form.notes || ''} 
                        onChange={e => setForm({...form, notes: e.target.value})} 
                        placeholder="Triggers, Max Bet, Volatility, etc..." 
                    />
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setView('list')} className="flex-1 bg-gray-700 py-2 rounded text-sm hover:bg-gray-600">Cancel</button>
                    <button onClick={handleSave} className="flex-1 bg-blue-600 py-2 rounded text-sm font-bold hover:bg-blue-500">Save</button>
                </div>
            </div>
        </div>
    );
    
    // --- LIST VIEW (With Search) ---
    return (
        <div className="space-y-4">
            {/* Header + Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                    <BookOpen className="text-blue-400"/> Play Info
                </h2>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Filter games..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-full py-2 pl-10 pr-8 text-sm text-white focus:border-blue-400 outline-none transition-colors focus:bg-gray-700"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')} 
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    
                    {/* Add Button */}
                    <button onClick={() => { setForm({}); setView('form'); }} className="bg-blue-600 p-2 rounded-full hover:bg-blue-500 shadow-lg shrink-0">
                        <Plus size={20} className="text-white"/>
                    </button>
                </div>
            </div>

            {/* Scrollable List */}
            <div className="grid grid-cols-1 gap-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredGames.length > 0 ? filteredGames.map(g => (
                    <div key={g.id} className="bg-gray-800 border border-gray-700 p-4 rounded-xl hover:border-blue-500/50 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{g.name}</h3>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setForm(g); setView('form'); }} className="text-gray-400 hover:text-blue-400 p-1"><Edit2 size={16}/></button>
                                <button onClick={() => onDelete(g.id)} className="text-gray-400 hover:text-red-400 p-1"><Trash2 size={16}/></button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">{g.notes}</p>
                    </div>
                )) : (
                    <div className="text-gray-500 text-center py-12 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
                        {searchTerm ? 'No games match your search.' : 'No games added yet.'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayInfo;