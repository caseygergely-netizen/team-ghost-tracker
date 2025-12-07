import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { 
  collection, onSnapshot, doc, updateDoc, addDoc, 
  serverTimestamp, query, orderBy, where, deleteDoc, getDocs, writeBatch 
} from 'firebase/firestore';
import { 
  Activity, BarChart2, Users, Settings, LogOut, ArrowLeft
} from 'lucide-react';

// --- IMPORT COMPONENTS ---
import LoginView from './components/LoginView';
import PapiDashboard from './components/PapiDashboard';
import OliverDashboard from './components/OliverDashboard';
import PlayerDashboard from './components/PlayerDashboard';
import SessionLogger from './components/SessionLogger';
import TeamPayLogger from './components/TeamPayLogger';
import MachineLogger from './components/MachineLogger';
import MachineAnalytics from './components/MachineAnalytics';
import TeamRoster from './components/TeamRoster';
import PlayerAdmin from './components/PlayerAdmin';
import PendingActionModal from './components/PendingActionModal';
import PlayInfo from './components/PlayInfo';
import ActiveShift from './components/ActiveShift';
import StartSessionModal from './components/StartSessionModal';

import { round5, getTierDetails, parseMoney } from './utils';

const App = () => {
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState(null);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [machineLogs, setMachineLogs] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [games, setGames] = useState([]); 
  const [view, setView] = useState('login'); 
  const [notification, setNotification] = useState(null);
  const [pendingActions, setPendingActions] = useState([]);
  const [editingSession, setEditingSession] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  
  const [activeShift, setActiveShift] = useState(() => {
      const saved = localStorage.getItem('activeShift');
      return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
      if (activeShift) localStorage.setItem('activeShift', JSON.stringify(activeShift));
      else localStorage.removeItem('activeShift');
  }, [activeShift]);

  // --- DATA LISTENERS ---
  useEffect(() => {
    const unsubPlayers = onSnapshot(collection(db, "players"), (snap) => setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSessions = onSnapshot(query(collection(db, "sessions"), orderBy("timestamp", "desc")), (snap) => setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubMachines = onSnapshot(query(collection(db, "machineLogs"), orderBy("timestamp", "desc")), (snap) => setMachineLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubGames = onSnapshot(collection(db, "games"), (snap) => setGames(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubPlayers(); unsubSessions(); unsubMachines(); unsubGames(); };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const unsubWithdrawals = onSnapshot(query(collection(db, "withdrawals"), where("playerId", "==", currentUser.id)), (snap) => {
        const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setWithdrawals(sorted);
    });
    const unsubPending = onSnapshot(query(collection(db, "pendingActions"), where("targetPlayerId", "==", currentUser.id)), (snap) => setPendingActions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubWithdrawals(); unsubPending(); };
  }, [currentUser]);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => (b.tierScore || 0) - (a.tierScore || 0));
  }, [players]);

  const casinoOptions = useMemo(() => {
    const counts = {};
    sessions.forEach(s => {
      if (s.casino) {
        const name = s.casino.trim();
        const weight = (s.playersInvolved && currentUser && s.playersInvolved.includes(currentUser.id)) ? 10 : 1;
        counts[name] = (counts[name] || 0) + weight;
      }
    });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }, [sessions, currentUser]);

  // --- HANDLERS ---
  const handleLogin = (player) => { setCurrentUser(player); setView('dashboard'); };
  const handleLogout = () => { setCurrentUser(null); setViewingPlayer(null); setView('login'); setPendingActions([]); };
  const showNotification = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };
  const handleViewPlayer = (player) => { setViewingPlayer(player); setView('spectator'); };
  const handleBackToTeam = () => { setViewingPlayer(null); setView('teamRoster'); };

  const handleStartShiftClick = () => {
    setShowStartModal(true);
  };

  const handleConfirmStartShift = (casino) => {
    setActiveShift({ casino, startTime: new Date().toISOString() });
    setShowStartModal(false);
    showNotification("Shift Started! Timer running.");
  };

  const handleEndShift = () => {
      setEditingSession(null); 
      setView('endShift'); // NEW VIEW FOR SHIFT END
  };

  // --- LOGIC ---
  const handleSessionSubmit = async (data) => {
    const { totalProfit, selectedPlayerIds, cashHolderId, casino, game, duration, sessionTimestamp, sessionId, isLegacy, papiBacked } = data;
    if (sessionId) await revertSessionMath(sessionId);
    const updates = [];

    if (!isLegacy) {
        let effectiveTeamProfit = totalProfit; let papiCut = 0;
        if (papiBacked) { papiCut = totalProfit * 0.50; effectiveTeamProfit = totalProfit * 0.50; }
        const profitPerPlayer = round5(effectiveTeamProfit / selectedPlayerIds.length);
        const pSnap = await getDocs(collection(db, "players"));
        const livePlayers = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (papiBacked) {
            const papi = livePlayers.find(p => p.role === 'investor');
            if (papi) updates.push(updateDoc(doc(db, "players", papi.id), { investorBalance: (papi.investorBalance || 0) + papiCut, lifetimeEarnings: (papi.lifetimeEarnings || 0) + papiCut }));
        }

        players.forEach(pLocal => {
          if (!selectedPlayerIds.includes(pLocal.id)) return;
          const player = livePlayers.find(lp => lp.id === pLocal.id) || pLocal;
          let { heldCash, pinnedBankroll, tierScore, peakScore, lifetimeEarnings, lifetimeHours, currentTier } = player;
          tierScore = tierScore || 0; peakScore = peakScore || tierScore; lifetimeEarnings = lifetimeEarnings || 0; lifetimeHours = (lifetimeHours || 0) + duration;
          if (selectedPlayerIds.length > 1) {
            if (player.id === cashHolderId) { heldCash += totalProfit; const amountOwed = totalProfit - profitPerPlayer; pinnedBankroll += amountOwed; } 
            else { pinnedBankroll -= profitPerPlayer; }
          } else { heldCash += profitPerPlayer; }
          if (selectedPlayerIds.length > 1) { lifetimeEarnings += profitPerPlayer; if (player.id === cashHolderId) tierScore += profitPerPlayer; } 
          else { lifetimeEarnings += profitPerPlayer; tierScore += profitPerPlayer; }
          if (tierScore > peakScore) peakScore = tierScore;
          updates.push(updateDoc(doc(db, "players", player.id), { heldCash, pinnedBankroll, tierScore, peakScore, lifetimeEarnings, lifetimeHours, currentTier: getTierDetails(peakScore, currentTier).level }));
        });
    }

    try {
      await Promise.all(updates);
      const sessionData = { timestamp: sessionTimestamp, createdAt: serverTimestamp(), casino, game: game || 'Shift', duration, totalProfit, playersInvolved: selectedPlayerIds, cashHolderId: cashHolderId || null, isLegacy: isLegacy || false, papiBacked: papiBacked || false, type: selectedPlayerIds.length > 1 ? 'team' : 'solo' };
      if (sessionId) { await updateDoc(doc(db, "sessions", sessionId), sessionData); showNotification("Session Updated!"); } 
      else { await addDoc(collection(db, "sessions"), sessionData); showNotification(isLegacy ? "Historical Entry Saved" : "Shift Logged!"); }
      
      // If we were ending a shift, clear it now
      if (view === 'endShift' || activeShift) setActiveShift(null);
      
      setEditingSession(null); setView('dashboard');
    } catch (e) { showNotification("Error logging session"); }
  };

  const revertSessionMath = async (sessionId) => {
    const sessionDoc = sessions.find(s => s.id === sessionId);
    if (!sessionDoc || sessionDoc.isLegacy) return;
    if (sessionDoc.papiBacked) {
        const papiCut = sessionDoc.totalProfit * 0.50;
        const papiDoc = (await getDocs(query(collection(db, "players"), where("role", "==", "investor")))).docs[0];
        if (papiDoc) await updateDoc(papiDoc.ref, { investorBalance: (papiDoc.data().investorBalance || 0) - papiCut, lifetimeEarnings: (papiDoc.data().lifetimeEarnings || 0) - papiCut });
    }
    const effectiveProfit = sessionDoc.papiBacked ? sessionDoc.totalProfit * 0.50 : sessionDoc.totalProfit;
    const profitPerPlayer = round5(effectiveProfit / sessionDoc.playersInvolved.length);
    const livePlayers = (await getDocs(collection(db, "players"))).docs.map(d => ({ id: d.id, ...d.data() }));
    const updates = [];
    sessionDoc.playersInvolved.forEach(pid => {
        const player = livePlayers.find(p => p.id === pid);
        if (!player) return; 
        let { heldCash, pinnedBankroll, tierScore, lifetimeEarnings, lifetimeHours } = player;
        lifetimeHours -= sessionDoc.duration;
        if (sessionDoc.type === 'team') {
            if (pid === sessionDoc.cashHolderId) { heldCash -= sessionDoc.totalProfit; pinnedBankroll -= (sessionDoc.totalProfit - profitPerPlayer); } 
            else { pinnedBankroll += profitPerPlayer; }
        } else { heldCash -= profitPerPlayer; }
        lifetimeEarnings -= profitPerPlayer;
        if (sessionDoc.type === 'team') { if (pid === sessionDoc.cashHolderId) tierScore -= profitPerPlayer; } else { tierScore -= profitPerPlayer; }
        updates.push(updateDoc(doc(db, "players", pid), { heldCash, pinnedBankroll, tierScore, lifetimeEarnings, lifetimeHours }));
    });
    await Promise.all(updates);
  };

  const handleDeleteSession = async (sessionId) => { if (window.confirm("Delete this session?")) { try { await revertSessionMath(sessionId); await deleteDoc(doc(db, "sessions", sessionId)); showNotification("Session Deleted"); } catch(e) { showNotification("Error deleting"); } } };
  
  const handleTeamPay = async (data) => {
    const { winnerId, amount } = data;
    const otherShares = round5(amount * 0.035);
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const playerActivity = {};
    sessions.forEach(s => { 
        if (new Date(s.timestamp.seconds * 1000) >= sevenDaysAgo) { 
            if (s.type === 'solo' && s.playersInvolved?.[0]) playerActivity[s.playersInvolved[0]] = (playerActivity[s.playersInvolved[0]] || 0) + 1;
            else if (s.type === 'team' && s.cashHolderId) playerActivity[s.cashHolderId] = (playerActivity[s.cashHolderId] || 0) + 1;
        } 
    });
    const activePlayerIds = players.filter(p => p.id !== winnerId && p.role !== 'backer' && p.role !== 'investor' && (playerActivity[p.id] || 0) >= 3).map(p => p.id);
    const winnerDoc = players.find(p => p.id === winnerId);
    if (winnerDoc.role !== 'backer' && winnerDoc.role !== 'investor') {
        const winnerRef = doc(db, "players", winnerId);
        const currentSurplus = winnerDoc.heldCash - winnerDoc.pinnedBankroll;
        const makeup = currentSurplus < 0 ? Math.abs(currentSurplus) : 0;
        let winnerPocket = 0; let pinInc = 0;
        if ((amount - makeup) > 0) { const profit = (amount - makeup); winnerPocket = round5(profit * 0.50); pinInc = profit - winnerPocket; }
        const newTier = (winnerDoc.tierScore || 0) + amount;
        const newPeak = Math.max((winnerDoc.peakScore || 0), newTier);
        const newEarnings = (winnerDoc.lifetimeEarnings || 0) + winnerPocket;
        await updateDoc(winnerRef, { heldCash: winnerDoc.heldCash + (amount - winnerPocket), pinnedBankroll: winnerDoc.pinnedBankroll + pinInc, tierScore: newTier, peakScore: newPeak, lifetimeEarnings: newEarnings, currentTier: getTierDetails(newPeak, winnerDoc.currentTier).level });
        showNotification(`Winner pocketed $${winnerPocket}`);
    } else { showNotification("Backer Win Logged"); }
    const batch = writeBatch(db);
    activePlayerIds.forEach(pid => { batch.set(doc(collection(db, "pendingActions")), { targetPlayerId: pid, type: 'TEAM_PAY_DISTRIBUTION', cashAmount: otherShares, bankrollAmount: otherShares, reason: `${winnerDoc.name} hit Team Pay ($${amount})`, timestamp: serverTimestamp() }); });
    await batch.commit(); setView('dashboard');
  };

  const handleAcknowledgeAction = async (action) => {
      if (!currentUser) return;
      const me = (await getDocs(collection(db, "players"))).docs.find(d => d.id === currentUser.id).data();
      await updateDoc(doc(db, "players", currentUser.id), { heldCash: me.heldCash - action.cashAmount, pinnedBankroll: me.pinnedBankroll - (action.cashAmount + action.bankrollAmount), lifetimeEarnings: (me.lifetimeEarnings || 0) + action.cashAmount });
      await addDoc(collection(db, "withdrawals"), { playerId: currentUser.id, amount: action.cashAmount, method: "Team Pay Cut", timestamp: serverTimestamp() });
      await deleteDoc(doc(db, "pendingActions", action.id)); showNotification("Confirmed.");
  };

  const handleSettleUp = async (playerCut, backerCut) => {
      if(!currentUser) return;
      const me = (await getDocs(collection(db, "players"))).docs.find(d => d.id === currentUser.id).data();
      await updateDoc(doc(db, "players", currentUser.id), { heldCash: me.heldCash - playerCut, pinnedBankroll: me.pinnedBankroll + backerCut });
      await addDoc(collection(db, "withdrawals"), { playerId: currentUser.id, amount: playerCut, method: "Settle Up", timestamp: serverTimestamp() });
      showNotification(`Settled! Took $${playerCut}`);
  };
  
  const handleTransferToBacker = async (amount) => {
      if (!currentUser) return;
      const me = (await getDocs(collection(db, "players"))).docs.find(d => d.id === currentUser.id).data();
      await updateDoc(doc(db, "players", currentUser.id), { heldCash: me.heldCash - amount, pinnedBankroll: me.pinnedBankroll - amount });
      await addDoc(collection(db, "withdrawals"), { playerId: currentUser.id, amount: amount, method: "Transfer to Backer", timestamp: serverTimestamp() });
      showNotification(`Transferred $${amount}`);
  };

  const handleTransferToPapi = async (amount) => {
      if (!currentUser) return;
      const papiDoc = players.find(p => p.role === 'investor');
      if (!papiDoc) return alert("No Investor found.");
      await updateDoc(doc(db, "players", papiDoc.id), { investorBalance: (papiDoc.investorBalance || 0) - amount });
      await addDoc(collection(db, "withdrawals"), { playerId: papiDoc.id, amount: amount, method: "Transfer from Oliver", timestamp: serverTimestamp() });
      showNotification(`Transferred $${amount} to Papi.`);
  };

  const handleMachineSubmit = async (data) => { await addDoc(collection(db, "machineLogs"), { ...data, loggedBy: currentUser.name, timestamp: serverTimestamp() }); showNotification("Data Saved"); setView('dashboard'); };
  const handleDeleteLog = async (id) => { if(window.confirm("Delete log?")) await deleteDoc(doc(db, "machineLogs", id)); };
  const handleDeleteWithdrawal = async (id) => { if(window.confirm("Delete withdrawal? Stats won't revert.")) await deleteDoc(doc(db, "withdrawals", id)); };
  const handleClearLogs = async (type) => { if(!window.confirm(`Delete ALL ${type} logs?`)) return; const q = query(collection(db, "machineLogs"), where("machineType", "==", type)); (await getDocs(q)).forEach(d => deleteDoc(d.ref)); showNotification("Cleared."); };
  const handleClearImports = async (type) => { 
      if(!window.confirm(`Delete ONLY imported logs for ${type}?`)) return; 
      const q = query(collection(db, "machineLogs"), where("machineType", "==", type), where("imported", "==", true)); 
      const batch = writeBatch(db);
      const snapshot = await getDocs(q);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      showNotification("Imported logs cleared."); 
  };
  
  const handleGameSubmit = async (gameData) => { if (gameData.id) { await updateDoc(doc(db, "games", gameData.id), gameData); } else { await addDoc(collection(db, "games"), gameData); } showNotification("Game Saved"); };
  const handleDeleteGame = async (id) => { if(window.confirm("Delete game info?")) await deleteDoc(doc(db, "games", id)); };

  const handleBulkImport = async (type, raw) => {
      const batch = writeBatch(db); let count = 0;
      raw.trim().split('\n').forEach(row => {
          const c = row.split(/\t|,/);
          let d = { machineType: type, timestamp: serverTimestamp(), imported: true };
          if (type === 'Phoenix Link') { d = { ...d, denom: c[0], bet: c[1], startingNum: c[2], moneyIn: c[3], moneyOut: c[4], location: c[5] }; } 
          else if (type === 'World Cruise') { d = { ...d, denom: c[0], bet: c[1], red: c[2], purple: c[3], green: c[4], count: c[5], moneyIn: c[6], moneyOut: c[7], location: c[8] }; } 
          else if (type === 'What the Duck') { d = { ...d, bet: c[0], explodes: c[1], bounties: c[2], moneyIn: c[3], moneyOut: c[4], location: 'Imported' }; } 
          else if (type === 'Temple Falls') { d = { ...d, bet: c[0], count: c[1], moneyIn: c[2], moneyOut: c[3], location: 'Imported' }; }
          const cin = parseMoney(d.moneyIn); const cout = parseMoney(d.moneyOut); const betVal = parseMoney(d.bet) || 1;
          d.unitWin = (cout - cin) / betVal; batch.set(doc(collection(db, "machineLogs")), d); count++;
      });
      try { await batch.commit(); showNotification(`Imported ${count}.`); } catch(e) { alert("Import Failed"); }
  };

  // --- RENDER HELPERS ---
  const renderDashboard = () => {
    if (currentUser.role === 'investor') {
      return <PapiDashboard players={players} sessions={sessions} withdrawals={withdrawals} />;
    }
    if (currentUser.role === 'backer') {
      return (
        <OliverDashboard 
          currentUser={currentUser}
          players={players}
          isShiftActive={!!activeShift}
          onStartShift={handleStartShiftClick}
          onEndShift={handleEndShift}
          onTransferToPapi={handleTransferToPapi}
          onTeamPay={() => setView('teamPay')}
          onLogMachine={() => setView('logMachine')}
          onLogTeamSession={() => setView('logTeamSession')}
        />
      );
    }
    return (
      <PlayerDashboard 
        currentUser={currentUser}
        players={players}
        sessions={sessions}
        withdrawals={withdrawals}
        isShiftActive={!!activeShift}
        onStartShift={handleStartShiftClick}
        onTeamPay={() => setView('teamPay')}
        onLogMachine={() => setView('logMachine')}
        onCashout={handleSettleUp}
        onTransfer={handleTransferToBacker}
        onEditSession={(s) => { setEditingSession(s); setView('logSession'); }}
        onDeleteSession={handleDeleteSession}
        onDeleteWithdrawal={handleDeleteWithdrawal}
        setView={setView}
      />
    );
  };

  if (view === 'login') return <LoginView players={sortedPlayers} sessions={sessions} onLogin={handleLogin} />;
  if (pendingActions.length > 0) return <PendingActionModal action={pendingActions[0]} onConfirm={handleAcknowledgeAction} />;
  
  if (view === 'spectator' && viewingPlayer) {
      return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 md:p-8">
            <header className="flex items-center mb-8 border-b border-gray-700 pb-4 gap-4"><button onClick={handleBackToTeam} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"><ArrowLeft size={20}/></button><h1 className="text-xl font-bold text-gray-400">Viewing: <span className="text-white">{viewingPlayer.name}</span></h1></header>
             <div className="p-4 bg-gray-800 rounded text-center">Spectator Mode (Stats Only)</div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 md:p-8">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
        <div>
          <h1 className="text-xl font-bold text-emerald-400 tracking-wider">TEAM GHOST</h1>
          <p className="text-xs text-gray-400">Player: <span className="text-white font-bold">{currentUser?.name}</span></p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => setView('dashboard')} className={`p-2 rounded ${view === 'dashboard' ? 'bg-emerald-600' : 'bg-gray-800'}`}><Activity size={20}/></button>
          
          {currentUser.role !== 'investor' && (
            <>
              <button onClick={() => setView('machineAnalytics')} className={`p-2 rounded ${view === 'machineAnalytics' ? 'bg-purple-600' : 'bg-gray-800'}`}><BarChart2 size={20}/></button>
              <button onClick={() => setView('teamRoster')} className={`p-2 rounded ${view === 'teamRoster' ? 'bg-emerald-600' : 'bg-gray-800'}`}><Users size={20}/></button>
              <button onClick={() => setView('settings')} className={`p-2 rounded ${view === 'settings' ? 'bg-emerald-600' : 'bg-gray-800'}`}><Settings size={20}/></button>
            </>
          )}
          
          <button onClick={handleLogout} className="p-2 rounded bg-red-900/50 text-red-400 ml-2"><LogOut size={20}/></button>
        </div>
      </header>
      
      {notification && <div className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded shadow-lg animate-bounce z-50">{notification}</div>}
      
      {/* MAIN CONTENT */}
      <main className="max-w-4xl mx-auto">
        {view === 'dashboard' && renderDashboard()}
        {view === 'teamRoster' && <TeamRoster players={players} sessions={sessions} onViewPlayer={handleViewPlayer} />}
        
        {/* --- SESSION LOGGER: Handles Edit, End Shift, and Team Log --- */}
        {(view === 'logSession' || view === 'endShift' || view === 'logTeamSession') && (
           <SessionLogger 
              players={players} 
              currentUser={currentUser} 
              casinoOptions={casinoOptions} 
              games={games} 
              initialData={editingSession} 
              activeShiftData={activeShift} 
              mode={(view === 'endShift' || (editingSession && !editingSession.playersInvolved)) ? 'shift' : 'team'}
              onSubmit={handleSessionSubmit} 
              onCancel={() => { setEditingSession(null); setView('dashboard'); }} 
            />
        )}

        {view === 'teamPay' && <TeamPayLogger players={players} onSubmit={handleTeamPay} onCancel={() => setView('dashboard')} />}
        {view === 'logMachine' && <MachineLogger onSubmit={handleMachineSubmit} onCancel={() => setView('dashboard')} />}
        {view === 'machineAnalytics' && <MachineAnalytics logs={machineLogs} onDeleteLog={handleDeleteLog} />}
        {view === 'playInfo' && <PlayInfo games={games} onAdd={handleGameSubmit} onEdit={handleGameSubmit} onDelete={handleDeleteGame} />}
        {view === 'settings' && <PlayerAdmin players={players} onImport={handleBulkImport} onClear={handleClearLogs} onClearImports={handleClearImports} />}
      </main>
      
      {/* ACTIVE SHIFT FOOTER */}
      {activeShift && <ActiveShift shift={activeShift} onEnd={handleEndShift} />}

      {/* MODAL FOR STARTING SHIFT */}
      {showStartModal && (
        <StartSessionModal 
          casinoOptions={casinoOptions} 
          onConfirm={handleConfirmStartShift} 
          onCancel={() => setShowStartModal(false)} 
        />
      )}
    </div>
  );
};

export default App;