import React, { useState } from 'react';
import { MapPin, Play, X, Briefcase } from 'lucide-react';

const StartSessionModal = ({ casinoOptions, defaultBackerPercent, onConfirm, onCancel }) => {
  const [casino, setCasino] = useState('');
  const [showList, setShowList] = useState(false);
  
  // BACKING PAUSED: freelance cut comes from the player's own profile
  // (defaultBackerPercent, default 25; 0 = paused). No per-session entry.
  const [isFreelance, setIsFreelance] = useState(true);
  const [backerPercent] = useState(defaultBackerPercent ?? 25);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (casino.trim()) {
        const rawCut = parseFloat(backerPercent);
        const safeCut = !isNaN(rawCut) ? rawCut : 0;

        onConfirm({ 
            casino, 
            isFreelance, 
            backerPercent: isFreelance ? safeCut : 0 
        });
    }
  };

  const filteredOptions = casinoOptions.filter(c => 
    c.toLowerCase().includes(casino.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-gray-800 p-6 rounded-xl border border-emerald-500 max-w-sm w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="text-emerald-400"/> Where are you?
          </h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-white"><X size={24}/></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="relative">
            <label className="block text-sm text-gray-400 mb-2">Casino Name</label>
            <input 
              type="text" 
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition"
              placeholder="e.g. Grand Villa"
              value={casino}
              onChange={(e) => setCasino(e.target.value)}
              onFocus={() => setShowList(true)}
              onBlur={() => setTimeout(() => setShowList(false), 200)}
              autoFocus
            />
            {showList && filteredOptions.length > 0 && (
              <div className="absolute z-10 w-full bg-gray-800 border border-gray-600 rounded-b-lg mt-1 shadow-xl overflow-hidden">
                {filteredOptions.map((c) => (
                  <button key={c} type="button" onClick={() => setCasino(c)} className="w-full text-left px-4 py-3 hover:bg-gray-700 text-gray-300 border-b border-gray-700 last:border-0">
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                      <Briefcase size={16} className={isFreelance ? "text-blue-400" : "text-gray-500"} />
                      Freelance Session?
                  </label>
                  <input type="checkbox" className="w-5 h-5 accent-blue-500" checked={isFreelance} onChange={e => setIsFreelance(e.target.checked)} />
              </div>
              
              {isFreelance && (
                  <div className="pt-2 border-t border-gray-700">
                      <div className="text-xs text-blue-300">Backer's cut: <span className="font-bold text-white">{backerPercent}%</span>{parseFloat(backerPercent) === 0 && <span className="text-gray-400"> (paused — you keep 100%)</span>}</div>
                  </div>
              )}
          </div>

          <button type="submit" disabled={!casino.trim()} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all">
            <Play fill="currentColor" /> START TIMER
          </button>
        </form>
      </div>
    </div>
  );
};

export default StartSessionModal;