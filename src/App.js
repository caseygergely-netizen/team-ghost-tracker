import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { 
  collection, onSnapshot, doc, updateDoc, addDoc, 
  serverTimestamp, query, orderBy, where, deleteDoc, getDocs, writeBatch,
  runTransaction, increment
} from 'firebase/firestore';
import { 
  Activity, BarChart2, Users, Settings, LogOut, ArrowLeft, Download 
} from 'lucide-react';

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
import { AuthProvider, useAuth } from './auth';

// --- BACKING STATUS ---
// Oliver's bankroll backing is PAUSED (indefinite). While true:
// - the dashboard tucks tier / surplus / old cash+debt into a collapsed archive,
// - freelance sessions use each player's own freelanceCutPercent (0 = paused),
//   with no per-session backer-percent entry.
// Flip to false if backing resumes.
const BACKING_PAUSED = true;

// --- EXPORT HELPERS (shared by the dashboard export and the unlinked reader export) ---
const cleanSessionForExport = (s) => {
  // Some imported/legacy sessions may lack a timestamp; fall back gracefully.
  const tsSeconds = s.timestamp?.seconds || s.createdAt?.seconds || null;
  const dateObj = tsSeconds ? new Date(tsSeconds * 1000) : new Date();
  return {
    id: s.id,
    date: dateObj.toLocaleDateString(),
    dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
    startTime: dateObj.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit' }),
    casino: s.casino,
    profit: s.totalProfit,
    duration: s.duration,
    type: s.type || 'team',
    players: s.playersInvolved?.length || 1,
    apPresent: s.apPresent || false,
    foundPlays: s.foundPlays !== undefined ? s.foundPlays : true
  };
};

const downloadExportJson = (cleanData) => {
  const dataStr = JSON.stringify(cleanData, null, 2);

  // Create a Blob (a file-like object)
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  // Create a hidden link, click it to trigger download, then clean up
  const link = document.createElement('a');
  link.href = url;
  link.download = `team-ghost-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// --- RACE-SAFE BALANCE HELPER ---
// Applies numeric deltas with Firestore's server-side increment(), so two
// people acting at the same time can't overwrite each other's math.
// `sets` are plain field assignments applied in the same write.
const addToPlayer = async (pid, deltas, sets = {}) => {
  const data = { ...sets };
  for (const [k, v] of Object.entries(deltas)) data[k] = increment(v);
  await updateDoc(doc(db, "players", pid), data);
};

const AuthedApp = () => {
  const { playerId, signOut } = useAuth();
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [machineLogs, setMachineLogs] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [games, setGames] = useState([]); 
  const [view, setView] = useState('dashboard'); 
  const [notification, setNotification] = useState(null);
  const [pendingActions, setPendingActions] = useState([]);
  const [editingSession, setEditingSession] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);

  // The logged-in player, resolved from the auth account's linked player doc.
  const currentUser = players.find(p => p.id === playerId) || null;
  
  const [activeShift, setActiveShift] = useState(() => {
      const saved = localStorage.getItem('activeShift');
      return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
      if (activeShift) localStorage.setItem('activeShift', JSON.stringify(activeShift));
      else localStorage.removeItem('activeShift');
  }, [activeShift]);

  const liveCurrentUser = useMemo(() => {
      if (!currentUser) return null;
      return players.find(p => p.id === currentUser.id) || currentUser;
  }, [players, currentUser]);

  useEffect(() => {
    const unsubPlayers = onSnapshot(collection(db, "players"), (snap) => setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const unsubSessions = onSnapshot(query(collection(db, "sessions"), orderBy("timestamp", "desc")), (snap) => setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubMachines = onSnapshot(query(collection(db, "machineLogs"), orderBy("timestamp", "desc")), (snap) => setMachineLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const unsubGames = onSnapshot(collection(db, "games"), (snap) => setGames(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubPlayers(); unsubSessions(); unsubMachines(); unsubGames(); };
  }, []);

  useEffect(() => {
    const targetId = viewingPlayer ? viewingPlayer.id : currentUser?.id;
    if (!targetId) return;
    
    const unsubWithdrawals = onSnapshot(query(collection(db, "withdrawals"), where("playerId", "==", targetId)), (snap) => {
        setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });
    
    let unsubPending = () => {};
    if (currentUser) {
        unsubPending = onSnapshot(query(collection(db, "pendingActions"), where("targetPlayerId", "==", currentUser.id)), (snap) => setPendingActions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }
    return () => { unsubWithdrawals(); unsubPending(); };
  }, [currentUser, viewingPlayer]);

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

  const handleLogout = () => { setViewingPlayer(null); setView('dashboard'); setPendingActions([]); signOut(); };
  const showNotification = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };
  const handleViewPlayer = (player) => { setViewingPlayer(player); setView('spectator'); };
  const handleBackToTeam = () => { setViewingPlayer(null); setView('teamRoster'); };
  const handleStartShiftClick = () => { setShowStartModal(true); };
  
  const handleConfirmStartShift = async (startData) => {
    const shiftState = { ...startData, startTime: new Date().toISOString() };
    setActiveShift(shiftState);
    setShowStartModal(false);
    if (currentUser) {
        await updateDoc(doc(db, "players", currentUser.id), { isLive: true, currentCasino: startData.casino });
    }
    showNotification("Shift Started!");
  };

  const handleEndShift = () => { setEditingSession(null); setView('endShift'); };

  // --- UPDATED EXPORT: NOW WITH PRECISE TIMES (HH:MM) ---
  const handleExportData = () => {
    downloadExportJson(sessions.map(cleanSessionForExport));
  };

  const handlePapiLegacyAdd = async (amount) => {
    if (!currentUser || currentUser.role !== 'backer') return;
    const papiDoc = players.find(p => p.role === 'investor');
    if (papiDoc) {
      await addToPlayer(papiDoc.id, { investorBalance: amount, lifetimeEarnings: amount });
      showNotification(`Added $${amount} to Papi.`);
    }
  };

  const handleSessionSubmit = async (data) => {
    let { 
        totalProfit, selectedPlayerIds, cashHolderId, casino, game, duration, 
        sessionTimestamp, sessionId, isLegacy, papiBacked, startAmount, endAmount,
        isFreelance, backerPercent, apPresent, foundPlays
    } = data;
    
    if (sessionId) await revertSessionMath(sessionId);

    // --- FREELANCE: HARD LOCKED TO MANUAL ENTRY ---
    if (isFreelance) {
        const manualProfit = parseMoney(data.totalProfit);
        const cutAmount = round5(manualProfit * (backerPercent / 100));
        
        const sessionData = { 
            timestamp: sessionTimestamp, 
            createdAt: serverTimestamp(), 
            casino, 
            game: 'Freelance', 
            duration, 
            totalProfit: manualProfit, 
            playersInvolved: [currentUser.id], 
            type: 'freelance', 
            backerPercent,
            backerCut: cutAmount,
            apPresent: apPresent || false,
            foundPlays: foundPlays !== undefined ? foundPlays : true 
        };

        if (sessionId) await updateDoc(doc(db, "sessions", sessionId), sessionData);
        else await addDoc(collection(db, "sessions"), sessionData);

        await addToPlayer(currentUser.id, { freelanceDebt: cutAmount }, { isLive: false, currentCasino: null });
        
        localStorage.removeItem('activeShift');
        setActiveShift(null);
        setEditingSession(null); setView('dashboard');
        showNotification("Freelance Saved Successfully.");
        return; 
    }

    // --- TEAM ADJUSTMENT LOGIC ---
    if (activeShift && !sessionId && (!selectedPlayerIds || (selectedPlayerIds.length === 1 && !papiBacked))) {
       const shiftStart = new Date(activeShift.startTime);
       const sessionsDuringShift = sessions.filter(s => {
          const sTime = new Date(s.timestamp.seconds * 1000);
          return sTime > shiftStart && s.type === 'team' && s.cashHolderId === currentUser.id;
       });
       const alreadyLoggedProfit = sessionsDuringShift.reduce((acc, s) => acc + s.totalProfit, 0);
       
       if (startAmount && endAmount && parseMoney(endAmount) !== 0) {
           const rawDiff = parseMoney(endAmount) - parseMoney(startAmount);
           totalProfit = rawDiff - alreadyLoggedProfit;
       }
    }

    if (activeShift && !sessionId) {
        await updateDoc(doc(db, "players", currentUser.id), { isLive: false, currentCasino: null });
    }

    const updates = [];
    if (!isLegacy) {
        let effectiveTeamProfit = totalProfit; let papiCut = 0;
        if (papiBacked) { papiCut = totalProfit * 0.50; effectiveTeamProfit = totalProfit * 0.50; }
        const profitPerPlayer = round5(effectiveTeamProfit / selectedPlayerIds.length);
        const isTeam = selectedPlayerIds.length > 1 || papiBacked;

        if (papiBacked) {
            const papiId = players.find(p => p.role === 'investor')?.id;
            if (papiId) updates.push(addToPlayer(papiId, { investorBalance: papiCut, lifetimeEarnings: papiCut }));
        }

        // Race-safe: every balance moves as an atomic delta. peakScore and
        // currentTier are derived inside a transaction from a fresh read.
        selectedPlayerIds.forEach(pid => {
          const isCashHolder = pid === cashHolderId;
          const deltas = { lifetimeEarnings: profitPerPlayer, lifetimeHours: duration };
          let tierDelta = 0;
          if (isTeam) {
            if (isCashHolder) { deltas.heldCash = totalProfit; deltas.pinnedBankroll = totalProfit - profitPerPlayer; tierDelta = profitPerPlayer; }
            else { deltas.pinnedBankroll = profitPerPlayer; }
          } else {
            deltas.heldCash = profitPerPlayer; tierDelta = profitPerPlayer;
          }
          deltas.tierScore = tierDelta;
          updates.push(runTransaction(db, async (t) => {
            const ref = doc(db, "players", pid);
            const d = (await t.get(ref)).data() || {};
            const newTier = (d.tierScore || 0) + tierDelta;
            const newPeak = Math.max(d.peakScore || d.tierScore || 0, newTier);
            const data = { peakScore: newPeak, currentTier: getTierDetails(newPeak, d.currentTier).level };
            for (const [k, v] of Object.entries(deltas)) data[k] = increment(v);
            t.update(ref, data);
          }));
        });
    }

    try {
      await Promise.all(updates);
      const sessionData = { 
          timestamp: sessionTimestamp, 
          createdAt: serverTimestamp(), 
          casino, 
          game: game || 'Shift', 
          duration, 
          totalProfit, 
          playersInvolved: selectedPlayerIds, 
          cashHolderId: cashHolderId || null, 
          isLegacy: isLegacy || false, 
          papiBacked: papiBacked || false, 
          type: (selectedPlayerIds.length > 1 || papiBacked) ? 'team' : 'solo',
          apPresent: apPresent || false,
          foundPlays: foundPlays !== undefined ? foundPlays : true
      };
      if (sessionId) await updateDoc(doc(db, "sessions", sessionId), sessionData);
      else await addDoc(collection(db, "sessions"), sessionData);
      setActiveShift(null);
      setEditingSession(null); setView('dashboard');
      showNotification("Session Saved!");
    } catch (e) { showNotification("Error logging session"); }
  };

  const revertSessionMath = async (sessionId) => {
    const sessionDoc = sessions.find(s => s.id === sessionId);
    if (!sessionDoc || sessionDoc.isLegacy) return;
    if (sessionDoc.type === 'freelance') {
        await addToPlayer(sessionDoc.playersInvolved[0], { freelanceDebt: -(sessionDoc.backerCut || 0) });
        return;
    }
    const updates = [];
    if (sessionDoc.papiBacked) {
        const papiCut = sessionDoc.totalProfit * 0.50;
        const papiDoc = (await getDocs(query(collection(db, "players"), where("role", "==", "investor")))).docs[0];
        if (papiDoc) updates.push(addToPlayer(papiDoc.id, { investorBalance: -papiCut, lifetimeEarnings: -papiCut }));
    }
    const effectiveProfit = sessionDoc.papiBacked ? sessionDoc.totalProfit * 0.50 : sessionDoc.totalProfit;
    const profitPerPlayer = round5(effectiveProfit / sessionDoc.playersInvolved.length);
    const isTeam = sessionDoc.type === 'team' || sessionDoc.papiBacked;
    // Exact inverse of the apply deltas above, as atomic increments.
    // peakScore is a high-water mark and is intentionally never reverted.
    sessionDoc.playersInvolved.forEach(pid => {
        const deltas = { lifetimeEarnings: -profitPerPlayer, lifetimeHours: -sessionDoc.duration, tierScore: 0 };
        if (isTeam) {
            if (pid === sessionDoc.cashHolderId) { deltas.heldCash = -sessionDoc.totalProfit; deltas.pinnedBankroll = -(sessionDoc.totalProfit - profitPerPlayer); deltas.tierScore = -profitPerPlayer; }
            else { deltas.pinnedBankroll = -profitPerPlayer; }
        } else {
            deltas.heldCash = -profitPerPlayer; deltas.tierScore = -profitPerPlayer;
        }
        updates.push(addToPlayer(pid, deltas));
    });
    await Promise.all(updates);
  };

  const handleDeleteSession = async (sessionId) => { if (window.confirm("Delete session?")) { await revertSessionMath(sessionId); await deleteDoc(doc(db, "sessions", sessionId)); showNotification("Deleted."); } };
  
  const handleTeamPay = async (data) => {
    const { winnerId, amount } = data;
    const otherShares = round5(amount * 0.035);
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const playerCounts = {};
    players.forEach(p => {
        const playerSessions = sessions.filter(s => {
            const sDate = new Date(s.timestamp.seconds * 1000);
            return sDate >= sevenDaysAgo && ((s.type === 'solo' && s.playersInvolved?.[0] === p.id) || (s.type === 'team' && s.cashHolderId === p.id));
        }).sort((a,b) => a.timestamp.seconds - b.timestamp.seconds);
        let count = 0; let lastSessionTime = 0;
        playerSessions.forEach(s => { if (s.timestamp.seconds * 1000 - lastSessionTime >= 25200000) { count++; lastSessionTime = s.timestamp.seconds * 1000; } });
        playerCounts[p.id] = count;
    });
    const activePlayerIds = players.filter(p => p.id !== winnerId && p.role !== 'backer' && p.role !== 'investor' && (playerCounts[p.id] || 0) >= 3).map(p => p.id);
    const winnerDoc = players.find(p => p.id === winnerId);
    let logData = { winnerId, amount, winnerPocket: 0, pinInc: 0, activePlayerIds, timestamp: serverTimestamp() };
    if (winnerDoc.role !== 'backer' && winnerDoc.role !== 'investor') {
        // Race-safe: makeup is computed from a fresh read inside the transaction.
        const { winnerPocket, pinInc } = await runTransaction(db, async (t) => {
            const ref = doc(db, "players", winnerId);
            const d = (await t.get(ref)).data() || {};
            const currentSurplus = (d.heldCash || 0) - (d.pinnedBankroll || 0);
            const makeup = currentSurplus < 0 ? Math.abs(currentSurplus) : 0;
            let winnerPocket = 0; let pinInc = 0;
            if ((amount - makeup) > 0) { const profit = (amount - makeup); winnerPocket = round5(profit * 0.50); pinInc = profit - winnerPocket; }
            const newTier = (d.tierScore || 0) + amount; const newPeak = Math.max((d.peakScore || 0), newTier);
            t.update(ref, {
                heldCash: increment(amount - winnerPocket),
                pinnedBankroll: increment(pinInc),
                tierScore: increment(amount),
                lifetimeEarnings: increment(winnerPocket),
                peakScore: newPeak,
                currentTier: getTierDetails(newPeak, d.currentTier).level,
            });
            return { winnerPocket, pinInc };
        });
        logData.winnerPocket = winnerPocket; logData.pinInc = pinInc;
    }
    const teamPayRef = await addDoc(collection(db, "teamPays"), logData);
    const batch = writeBatch(db);
    activePlayerIds.forEach(pid => { batch.set(doc(collection(db, "pendingActions")), { targetPlayerId: pid, type: 'TEAM_PAY_DISTRIBUTION', cashAmount: otherShares, bankrollAmount: otherShares, reason: `${winnerDoc.name} hit Team Pay ($${amount})`, timestamp: serverTimestamp(), sourceTeamPayId: teamPayRef.id }); });
    await batch.commit(); setView('dashboard');
  };

  const handleAcknowledgeAction = async (action) => {
      if (!currentUser) return;
      await addToPlayer(currentUser.id, { heldCash: -action.cashAmount, pinnedBankroll: -(action.cashAmount + action.bankrollAmount), lifetimeEarnings: action.cashAmount });
      await addDoc(collection(db, "withdrawals"), { playerId: currentUser.id, amount: action.cashAmount, method: "Team Pay Cut", timestamp: serverTimestamp() });
      await deleteDoc(doc(db, "pendingActions", action.id)); showNotification("Confirmed.");
  };

  const handleSettleUp = async (playerCut, backerCut) => {
      if(!currentUser) return;
      await addToPlayer(currentUser.id, { heldCash: -playerCut, pinnedBankroll: backerCut });
      await addDoc(collection(db, "withdrawals"), { playerId: currentUser.id, amount: playerCut, method: "Settle Up", timestamp: serverTimestamp() });
      showNotification(`Settled! Took $${playerCut}`);
      window.open(`https://wa.me/17787004641?text=${encodeURIComponent(`TEAM GHOST: Settle up claim for $${playerCut}.`)}`, '_blank');
  };
  
  const handleTransferToBacker = async (amount) => {
      if (!currentUser) return;
      await addToPlayer(currentUser.id, { heldCash: -amount, pinnedBankroll: -amount });
      await addDoc(collection(db, "withdrawals"), { playerId: currentUser.id, amount: amount, method: "Transfer to Backer", timestamp: serverTimestamp() });
      showNotification(`Transferred $${amount}`);
  };

  const handleTransferToPapi = async (amount) => {
      if (!currentUser) return;
      const papiDoc = players.find(p => p.role === 'investor');
      if (!papiDoc) return;
      await addToPlayer(papiDoc.id, { investorBalance: -amount });
      await addDoc(collection(db, "withdrawals"), { playerId: papiDoc.id, amount: amount, method: "Transfer from Oliver", timestamp: serverTimestamp() });
      showNotification(`Transferred $${amount} to Papi.`);
  };

  const handleClaimBonus = async (amount, weekId) => {
      if (!currentUser) return;
      await addToPlayer(currentUser.id, { heldCash: -amount, pinnedBankroll: -amount }, { lastBonusClaimDate: weekId });
      await addDoc(collection(db, "withdrawals"), { playerId: currentUser.id, amount: amount, method: "Weekly Rebate Bonus", timestamp: serverTimestamp() });
      showNotification(`Bonus Claimed!`);
      window.open(`https://wa.me/17787004641?text=${encodeURIComponent(`TEAM GHOST: I claimed my weekly bonus of $${amount}.`)}`, '_blank');
  };

  const handleSettleFreelanceTab = async () => {
      if (!currentUser) return;
      const me = players.find(p => p.id === currentUser.id) || currentUser;
      const amount = me.freelanceDebt || 0;
      if (amount === 0) return;
      await updateDoc(doc(db, "players", currentUser.id), { freelanceDebt: 0 });
      await addDoc(collection(db, "withdrawals"), { playerId: currentUser.id, amount: amount, method: "Freelance Tab Settlement", timestamp: serverTimestamp() });
      const msg = amount > 0 ? `Freelance Settle: I am e-transferring you $${amount}.` : `Freelance Settle: Please e-transfer me $${Math.abs(amount)}.`;
      window.open(`https://wa.me/17787004641?text=${encodeURIComponent(msg)}`, '_blank');
      showNotification("Tab Settled.");
  };

  const handleDeleteLog = async (id) => { if(window.confirm("Delete log?")) await deleteDoc(doc(db, "machineLogs", id)); };
  const handleDeleteWithdrawal = async (id) => { if(window.confirm("Delete withdrawal?")) await deleteDoc(doc(db, "withdrawals", id)); };

  const renderDashboard = () => {
    if (currentUser.role === 'investor') return <PapiDashboard players={players} sessions={sessions} withdrawals={withdrawals} />;
    if (currentUser.role === 'backer') return <OliverDashboard currentUser={liveCurrentUser} players={players} sessions={sessions} isShiftActive={!!activeShift} onStartShift={handleStartShiftClick} onEndShift={handleEndShift} onTransferToPapi={handleTransferToPapi} onPapiLegacyAdd={handlePapiLegacyAdd} onTeamPay={() => setView('teamPay')} onLogMachine={() => setView('logMachine')} onLogTeamSession={() => setView('logTeamSession')} onEditSession={(s) => { setEditingSession(s); setView('logSession'); }} onDeleteSession={handleDeleteSession} onDeleteWithdrawal={handleDeleteWithdrawal} onClaimBonus={handleClaimBonus} backingPaused={BACKING_PAUSED} />;
    return <PlayerDashboard currentUser={liveCurrentUser} players={players} sessions={sessions} withdrawals={withdrawals} isShiftActive={!!activeShift} onStartShift={handleStartShiftClick} onTeamPay={() => setView('teamPay')} onLogMachine={() => setView('logMachine')} onCashout={handleSettleUp} onTransfer={handleTransferToBacker} onClaimBonus={handleClaimBonus} onSettleFreelanceTab={handleSettleFreelanceTab} onEditSession={(s) => { setEditingSession(s); setView('logSession'); }} onDeleteSession={handleDeleteSession} onDeleteWithdrawal={handleDeleteWithdrawal} setView={setView} backingPaused={BACKING_PAUSED} />;
  };

  if (pendingActions.length > 0) return <PendingActionModal action={pendingActions[0]} onConfirm={handleAcknowledgeAction} />;

  // The player list may not have arrived yet when the app first mounts.
  // Never render the dashboard without a resolved player.
  if (players.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading your data...</p>
      </div>
    );
  }
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold text-emerald-400 mb-2">TEAM GHOST</h1>
        <p className="text-gray-400 text-sm mb-6 text-center">
          Signed in, but your player could not be found.<br />Ask Casey to check the player list.
        </p>
        <button onClick={handleLogout} className="p-3 rounded-xl bg-gray-800 text-white font-bold">
          Sign Out
        </button>
      </div>
    );
  }
  
  if (view === 'spectator' && viewingPlayer) {
      return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
            <header className="flex items-center mb-8 border-b border-gray-700 pb-4 gap-4">
                <button onClick={handleBackToTeam} className="p-2 bg-gray-800 rounded-full"><ArrowLeft size={20}/></button>
                <h1 className="text-xl font-bold">Viewing: {viewingPlayer.name}</h1>
            </header>
             <PlayerDashboard currentUser={liveCurrentUser} viewingUser={viewingPlayer} players={players} sessions={sessions} withdrawals={withdrawals} isShiftActive={false} onStartShift={() => {}} onTeamPay={() => {}} onLogMachine={() => {}} onCashout={() => {}} onTransfer={() => {}} onClaimBonus={() => {}} onEditSession={() => {}} onDeleteSession={() => {}} onDeleteWithdrawal={() => {}} setView={() => {}} backingPaused={BACKING_PAUSED} />
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
        <div><h1 className="text-xl font-bold text-emerald-400">TEAM GHOST</h1><p className="text-xs text-gray-400">Player: {currentUser?.name}</p></div>
        <div className="flex gap-2">
          <button onClick={() => setView('dashboard')} className={`p-2 rounded ${view === 'dashboard' ? 'bg-emerald-600' : 'bg-gray-800'}`}><Activity size={20}/></button>
          {currentUser.role !== 'investor' && (
            <>
              <button onClick={() => setView('machineAnalytics')} className={`p-2 rounded ${view === 'machineAnalytics' ? 'bg-purple-600' : 'bg-gray-800'}`}><BarChart2 size={20}/></button>
              <button onClick={() => setView('teamRoster')} className={`p-2 rounded ${view === 'teamRoster' ? 'bg-emerald-600' : 'bg-gray-800'}`}><Users size={20}/></button>
              <button onClick={() => setView('settings')} className={`p-2 rounded ${view === 'settings' ? 'bg-emerald-600' : 'bg-gray-800'}`}><Settings size={20}/></button>
            </>
          )}
          <button onClick={handleExportData} className="p-2 rounded bg-blue-900/50 text-blue-400 ml-2"><Download size={20}/></button>
          <button onClick={handleLogout} className="p-2 rounded bg-red-900/50 text-red-400 ml-2"><LogOut size={20}/></button>
        </div>
      </header>
      {notification && <div className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded z-50 animate-bounce">{notification}</div>}
      <main className="max-w-4xl mx-auto pb-32">
        {view === 'dashboard' && renderDashboard()}
        {view === 'teamRoster' && <TeamRoster players={players} sessions={sessions} onViewPlayer={handleViewPlayer} />}
        {(view === 'logSession' || view === 'endShift' || view === 'logTeamSession') && (
           <SessionLogger players={players} currentUser={liveCurrentUser} casinoOptions={casinoOptions} games={games} initialData={editingSession} activeShiftData={activeShift} mode={(view === 'endShift' || (editingSession && (editingSession.type === 'solo' || editingSession.type === 'freelance' || (!editingSession.type && editingSession.playersInvolved?.length === 1)))) ? 'shift' : 'team'} onSubmit={handleSessionSubmit} onCancel={() => { setEditingSession(null); setView('dashboard'); }} />
        )}
        {view === 'teamPay' && <TeamPayLogger players={players} onSubmit={handleTeamPay} onCancel={() => setView('dashboard')} />}
        {view === 'logMachine' && <MachineLogger currentUser={liveCurrentUser} onCancel={() => setView('dashboard')} />}
        {view === 'machineAnalytics' && <MachineAnalytics logs={machineLogs} sessions={sessions} onDeleteLog={handleDeleteLog} />}
        {view === 'playInfo' && <PlayInfo games={games} />}
        {view === 'settings' && <PlayerAdmin players={players} />}
      </main>
      {activeShift && !['logSession', 'logTeamSession', 'teamPay', 'logMachine', 'playInfo'].includes(view) && (
        <ActiveShift shift={activeShift} onEnd={handleEndShift} />
      )}
      {showStartModal && <StartSessionModal casinoOptions={casinoOptions} defaultBackerPercent={liveCurrentUser?.freelanceCutPercent ?? 25} onConfirm={handleConfirmStartShift} onCancel={() => setShowStartModal(false)} />}
    </div>
  );
};

/**
 * Gate: nobody sees or touches any data without a signed-in account.
 * - Still checking the session -> spinner.
 * - No session -> sign in / claim screen.
 * - Session but no linked player -> explain + offer sign out (rare; e.g. link removed).
 * - Otherwise -> the app. Subscriptions only start here, so unauthenticated
 *   devices never even attempt a Firestore read.
 */
const App = () => (
  <AuthProvider>
    <AuthGate />
  </AuthProvider>
);

const AuthGate = () => {
  const { user, playerId, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }
  if (!user) return <LoginView />;
  if (!playerId) {
    // Reader accounts (not linked to a player) can still export session data
    // for automated analysis. Firestore rules already grant any signed-in user
    // full read access, so this exposes nothing new.
    const handleUnlinkedExport = async () => {
      try {
        const snap = await getDocs(collection(db, "sessions"));
        downloadExportJson(snap.docs.map(d => cleanSessionForExport({ id: d.id, ...d.data() })));
      } catch (e) {
        alert("Export failed: " + e.message);
      }
    };
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold text-emerald-400 mb-2">TEAM GHOST</h1>
        <p className="text-gray-400 text-sm mb-6 text-center">
          This account isn't linked to a player yet.<br />Ask Casey to link it, then sign in again.
        </p>
        <button
          onClick={handleUnlinkedExport}
          className="p-3 rounded-xl bg-blue-900/50 text-blue-300 font-bold text-sm mb-3"
        >
          Export Data
        </button>
        <button
          onClick={signOut}
          className="p-3 rounded-xl bg-gray-800 text-white font-bold"
        >
          Sign Out
        </button>
      </div>
    );
  }
  return <AuthedApp />;
};
export default App;
