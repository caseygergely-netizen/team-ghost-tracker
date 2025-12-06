import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';

const TeamPayLogger = ({ players, onSubmit, onCancel }) => {
  const [winnerId, setWinnerId] = useState(''); const [amount, setAmount] = useState('');
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-yellow-600/30"><h2 className="text-xl font-bold mb-6 text-yellow-400 flex items-center gap-2"><DollarSign /> Log Team Pay (Jackpot)</h2><div className="space-y-4"><div><label className="block text-sm text-gray-400 mb-1">Winner</label><select className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={winnerId} onChange={e => setWinnerId(e.target.value)}><option value="">Select Winner</option>{players.filter(p => p.role !== 'backer' && p.role !== 'investor').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div><label className="block text-sm text-gray-400 mb-1">Amount ($)</label><input type="number" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-xl font-bold text-yellow-400" value={amount} onChange={e => setAmount(e.target.value)} /></div><div className="flex gap-3 pt-4"><button onClick={onCancel} className="flex-1 bg-gray-700 py-3 rounded">Cancel</button><button onClick={() => onSubmit({ winnerId, amount: parseFloat(amount) })} disabled={!winnerId || !amount} className="flex-1 bg-yellow-600 py-3 rounded font-bold text-black disabled:opacity-50">Process</button></div></div></div>
  );
};
export default TeamPayLogger;