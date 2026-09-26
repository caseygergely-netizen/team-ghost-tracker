import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { collection, getDocs, updateDoc } from 'firebase/firestore';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/**
 * Owns the Firebase Auth session and links it to a player document.
 * A player is linked once, the first time they claim their name.
 * The session persists on the device, so day-to-day the app just opens.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDocs(collection(db, 'players'));
          const match = snap.docs.find((d) => d.data().authUid === u.uid);
          setPlayerId(match ? match.id : null);
        } catch (e) {
          setPlayerId(null);
        }
      } else {
        setPlayerId(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = (email, password) =>
    signInWithEmailAndPassword(auth, email.trim(), password);

  /**
   * First-time setup: create the auth account, then link it to the
   * player whose name matches. Cleans up the account if linking fails
   * so nobody ends up with an orphan login.
   */
  const claimPlayer = async (playerName, email, password) => {
    const cleanEmail = email.trim();
    const norm = playerName.trim().toLowerCase();
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    try {
      const snap = await getDocs(collection(db, 'players'));
      const matches = snap.docs.filter(
        (d) => (d.data().name || '').trim().toLowerCase() === norm
      );
      if (matches.length === 0) throw new Error('NO_PLAYER');
      if (matches.length > 1) throw new Error('AMBIGUOUS_PLAYER');
      const pdoc = matches[0];
      if (pdoc.data().authUid) throw new Error('ALREADY_CLAIMED');
      await updateDoc(pdoc.ref, { authUid: cred.user.uid, email: cleanEmail });
      setPlayerId(pdoc.id);
      return pdoc.id;
    } catch (e) {
      // Don't leave a login that isn't linked to anyone.
      try { await cred.user.delete(); } catch (delErr) { /* already signed in; harmless */ }
      throw e;
    }
  };

  const signOut = () => fbSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, playerId, loading, signIn, claimPlayer, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
