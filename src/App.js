import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { 
  collection, onSnapshot, doc, updateDoc, addDoc, 
  serverTimestamp, query, orderBy, where, deleteDoc, getDocs, writeBatch, getDoc 
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

const App = () => {
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

  const liveCurrentUser = useMemo(() => {
      if (!currentUser) return null;
      return players.find(p => p.id === currentUser.id) || currentUser;
  }, [players, currentUser]);

  useEffect(() => {
    const unsubPlayers = onSnapshot(collection(db, "players"), (snap) => setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    // REMOVED LIMITS HERE
    const unsubSessions = onSnapshot(query(collection(db, "sessions"), orderBy("timestamp", "desc")), (snap) => setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubMachines = onSnapshot(query(collection(db, "machineLogs"), orderBy("timestamp", "desc")), (snap) => setMachineLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const unsubGames = onSnapshot(collection(db, "games"), (snap) => setGames(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubPlayers(); unsubSessions(); unsubMachines(); unsubGames(); };
  }, []);

  useEffect(() => {
    const targetId = viewingPlayer ? viewingPlayer.id : currentUser?.id;
    if (!targetId) return;
    
    // REMOVED LIMIT HERE
    const unsubWithdrawals = onSnapshot(query(collection(db, "withdrawals"), where("playerId", "==", targetId)), (snap) => {
        setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });
    
    let unsubPending = () => {};
    if (currentUser) {
        unsubPending = onSnapshot(query(collection(db, "pendingActions"), where("targetPlayerId", "==", currentUser.id)), (snap) => setPendingActions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }
    return () => { unsubWithdrawals(); unsubPending(); };
  }, [currentUser, viewingPlayer]);

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => (b.tierScore || 0) - (a.tierScore || 0)), [players]);

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

  const handleLogin = (player) => { setCurrentUser(player); setView('dashboard'); };
  const handleLogout = () => { setCurrentUser(null); setViewingPlayer(null); setView('login'); setPendingActions([]); };
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

  const handleExportData = () => {
    const cleanData = sessions.map(s => ({
      date: new Date(s.timestamp.seconds * 1000).toLocaleDateString(),
      casino: s.casino,
      profit: s.totalProfit,
      duration: s.duration,
      type: s.type || 'team', 
      players: s.playersInvolved?.length || 1,
      apPresent: s.apPresent || false // Included in export so you can analyze it in Excel/Python
    }));
    navigator.clipboard.writeText(JSON.stringify(cleanData, null, 2));
    alert("Data copied to clipboard!");
  };

  const handlePapiLegacyAdd = async (amount) => {
    if (!currentUser || currentUser.role !== 'backer') return;
    const papiDoc = players.find(p => p.role === 'investor');
    if (papiDoc) {
      await updateDoc(doc(db, "players", papiDoc.id), { investorBalance: (papiDoc.investorBalance || 0) + amount, lifetimeEarnings: (papiDoc.lifetimeEarnings || 0) + amount });
      showNotification(`Added $${amount} to Papi.`);
    }
  };

  const handleSessionSubmit = async (data) => {
    let { 
        totalProfit, selectedPlayerIds, cashHolderId, casino, game, duration, 
        sessionTimestamp, sessionId, isLegacy, papiBacked, startAmount, endAmount,
        isFreelance, backerPercent, apPresent // <-- NEW: Added apPresent extraction
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
            apPresent: apPresent || false // <-- NEW: Save AP flag
        };

        if (sessionId) await updateDoc(doc(db, "sessions", sessionId), sessionData);
        else await addDoc(collection(db, "sessions"), sessionData);

        const me = players.find(p => p.id === currentUser.id) || currentUser;
        await updateDoc(doc(db, "players", currentUser.id), { 
            freelanceDebt: (me.freelanceDebt || 0) + cutAmount,
            isLive: false,
            currentCasino: null 
        });
        
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
          
          if (selectedPlayerIds.length > 1 || papiBacked) {
            if (player.id === cashHolderId) { heldCash += totalProfit; pinnedBankroll += (totalProfit - profitPerPlayer); } 
            else { pinnedBankroll += profitPerPlayer; }
          } else { heldCash += profitPerPlayer; }

          if (selectedPlayerIds.length > 1 || papiBacked) { 
              lifetimeEarnings += profitPerPlayer; 
              if (player.id === cashHolderId) tierScore += profitPerPlayer; 
          } else { 
              lifetimeEarnings += profitPerPlayer; tierScore += profitPerPlayer; 
          }

          if (tierScore > peakScore) peakScore = tierScore;
          updates.push(updateDoc(doc(db, "players", player.id), { heldCash, pinnedBankroll, tierScore, peakScore, lifetimeEarnings, lifetimeHours, currentTier: getTierDetails(peakScore, currentTier).level }));
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
          apPresent: apPresent || false // <-- NEW: Save AP flag
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
        const playerDoc = await getDoc(doc(db, "players", sessionDoc.playersInvolved[0]));
        const currentTab = playerDoc.data().freelanceDebt || 0;
        await updateDoc(playerDoc.ref, { freelanceDebt: currentTab - sessionDoc.backerCut });
        return;
    }
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
        if (sessionDoc.type === 'team' || sessionDoc.papiBacked) {
            if (pid === sessionDoc.cashHolderId) { heldCash -= sessionDoc.totalProfit; pinnedBankroll -= (sessionDoc.totalProfit - profitPerPlayer); } 
            else { pinnedBankroll += profitPerPlayer; }
        } else { heldCash -= profitPerPlayer; }
        lifetimeEarnings -= profitPerPlayer;
        if (sessionDoc.type === 'team' || sessionDoc.papiBacked) { if (pid === sessionDoc.cashHolderId) tierScore -= profitPerPlayer; } else { tierScore -= profitPerPlayer; }
        updates.push(updateDoc(doc(db, "players", pid), { heldCash, pinnedBankroll, tierScore, lifetimeEarnings, lifetimeHours }));
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
        const currentSurplus = winnerDoc.heldCash - winnerDoc.pinnedBankroll;
        const makeup = currentSurplus < 0 ? Math.abs(currentSurplus) : 0;
        let winnerPocket = 0; let pinInc = 0;
        if ((amount - makeup) > 0) { const profit = (amount - makeup); winnerPocket = round5(profit * 0.50); pinInc = profit - winnerPocket; }
        logData.winnerPocket = winnerPocket; logData.pinInc = pinInc;
        const newTier = (winnerDoc.tierScore || 0) + amount; const newPeak = Math.max((winnerDoc.peakScore || 0), newTier);
        await updateDoc(doc(db, "players", winnerId), { heldCash: winnerDoc.heldCash + (amount - winnerPocket), pinnedBankroll: winnerDoc.pinnedBankroll + pinInc, tierScore: newTier, peakScore: newPeak, lifetimeEarnings: (winnerDoc.lifetimeEarnings || 0) + winnerPocket, currentTier: getTierDetails(newPeak, winnerDoc.currentTier).level });
    }
    const teamPayRef = await addDoc(collection(db, "teamPays"), logData);
    const batch = writeBatch(db);
    activePlayerIds.forEach(pid => { batch.set(doc(collection(db, "pendingActions")), { targetPlayerId: pid, type: 'TEAM_PAY_DISTRIBUTION', cashAmount: otherShares, bankrollAmount: otherShares, reason: `${winnerDoc.name} hit Team Pay ($${amount})`, timestamp: serverTimestamp(), sourceTeamPayId: teamPayRef.id }); });
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
      await updateDoc(doc(db, "players", currentUser.id), { heldCash: currentUser.heldCash - playerCut, pinnedBankroll: currentUser.pinnedBankroll + backerCut });
      await addDoc(collection(db, "withdrawals"), { playerId: currentUser.id, amount: playerCut, method: "Settle Up", timestamp: serverTimestamp() });
      showNotification(`Settled! Took $${playerCut}`);
      window.open(`https://wa.me/17787004641?text=${encodeURIComponent(`TEAM GHOST: Settle up claim for $${playerCut}.`)}`, '_blank');
  };
  
  const handleTransferToBacker = async (amount) => {
      if (!currentUser) return;
      await updateDoc(doc(db, "players", currentUser.id), { heldCash: currentUser.heldCash - amount, pinnedBankroll: currentUser.pinnedBankroll - amount });
      await addDoc(collection(db, "withdrawals"), { playerId: currentUser.id, amount: amount, method: "Transfer to Backer", timestamp: serverTimestamp() });
      showNotification(`Transferred $${amount}`);
  };

  const handleTransferToPapi = async (amount) => {
      if (!currentUser) return;
      const papiDoc = players.find(p => p.role === 'investor');
      if (!papiDoc) return;
      await updateDoc(doc(db, "players", papiDoc.id), { investorBalance: (papiDoc.investorBalance || 0) - amount });
      await addDoc(collection(db, "withdrawals"), { playerId: papiDoc.id, amount: amount, method: "Transfer from Oliver", timestamp: serverTimestamp() });
      showNotification(`Transferred $${amount} to Papi.`);
  };

  const handleClaimBonus = async (amount, weekId) => {
      if (!currentUser) return;
      await updateDoc(doc(db, "players", currentUser.id), { heldCash: currentUser.heldCash - amount, pinnedBankroll: currentUser.pinnedBankroll - amount, lastBonusClaimDate: weekId });
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
    if (currentUser.role === 'backer') return <OliverDashboard currentUser={liveCurrentUser} players={players} sessions={sessions} isShiftActive={!!activeShift} onStartShift={handleStartShiftClick} onEndShift={handleEndShift} onTransferToPapi={handleTransferToPapi} onPapiLegacyAdd={handlePapiLegacyAdd} onTeamPay={() => setView('teamPay')} onLogMachine={() => setView('logMachine')} onLogTeamSession={() => setView('logTeamSession')} onEditSession={(s) => { setEditingSession(s); setView('logSession'); }} onDeleteSession={handleDeleteSession} onDeleteWithdrawal={handleDeleteWithdrawal} onClaimBonus={handleClaimBonus} />;
    return <PlayerDashboard currentUser={liveCurrentUser} players={players} sessions={sessions} withdrawals={withdrawals} isShiftActive={!!activeShift} onStartShift={handleStartShiftClick} onTeamPay={() => setView('teamPay')} onLogMachine={() => setView('logMachine')} onCashout={handleSettleUp} onTransfer={handleTransferToBacker} onClaimBonus={handleClaimBonus} onSettleFreelanceTab={handleSettleFreelanceTab} onEditSession={(s) => { setEditingSession(s); setView('logSession'); }} onDeleteSession={handleDeleteSession} onDeleteWithdrawal={handleDeleteWithdrawal} setView={setView} />;
  };

  if (view === 'login') return <LoginView players={sortedPlayers} sessions={sessions} onLogin={handleLogin} />;
  if (pendingActions.length > 0) return <PendingActionModal action={pendingActions[0]} onConfirm={handleAcknowledgeAction} />;
  
  if (view === 'spectator' && viewingPlayer) {
      return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
            <header className="flex items-center mb-8 border-b border-gray-700 pb-4 gap-4">
                <button onClick={handleBackToTeam} className="p-2 bg-gray-800 rounded-full"><ArrowLeft size={20}/></button>
                <h1 className="text-xl font-bold">Viewing: {viewingPlayer.name}</h1>
            </header>
             <PlayerDashboard currentUser={liveCurrentUser} viewingUser={viewingPlayer} players={players} sessions={sessions} withdrawals={withdrawals} isShiftActive={false} onStartShift={() => {}} onTeamPay={() => {}} onLogMachine={() => {}} onCashout={() => {}} onTransfer={() => {}} onClaimBonus={() => {}} onEditSession={() => {}} onDeleteSession={() => {}} onDeleteWithdrawal={() => {}} setView={() => {}} />
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
      {showStartModal && <StartSessionModal casinoOptions={casinoOptions} onConfirm={handleConfirmStartShift} onCancel={() => setShowStartModal(false)} />}
    </div>
  );
};

export default App;