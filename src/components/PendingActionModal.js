import React from 'react';
import { AlertTriangle } from 'lucide-react';

const PendingActionModal = ({ action, onConfirm }) => (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 p-6 rounded-xl border border-yellow-500 max-w-sm w-full">
            <div className="flex items-center gap-3 text-yellow-400 mb-4">
                <AlertTriangle size={32} />
                <h2 className="text-xl font-bold">Action Required</h2>
            </div>
            <p className="text-gray-300 mb-4">{action.reason}</p>
            <div className="bg-gray-900 p-4 rounded mb-6">
                <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Remove Cash:</span>
                    <span className="text-red-400 font-bold">-${action.cashAmount}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Bankroll Credit:</span>
                    <span className="text-emerald-400 font-bold">+${action.bankrollAmount}</span>
                </div>
            </div>
            <button onClick={() => onConfirm(action)} className="w-full bg-yellow-600 text-black font-bold py-3 rounded hover:bg-yellow-500">
                Confirm & Update Stats
            </button>
        </div>
    </div>
);

export default PendingActionModal;