import React, { useState } from 'react';
import { useAuth } from '../auth';

const friendlyError = (err) => {
  if (!err) return 'Something went wrong. Try again.';
  if (err.message === 'NO_PLAYER')
    return "No player found with that name. Check the spelling and try again.";
  if (err.message === 'AMBIGUOUS_PLAYER')
    return "More than one player matches that name. Ask Casey to sort it out.";
  if (err.message === 'ALREADY_CLAIMED')
    return "That player is already claimed. Sign in instead.";
  switch (err.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.';
    case 'auth/email-already-in-use':
      return 'That email already has an account. Sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a bit and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return 'Something went wrong. Try again.';
  }
};

const LoginView = () => {
  const { signIn, claimPlayer } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'claim'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await claimPlayer(playerName, email, password);
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full p-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500';

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-emerald-400 mb-2 tracking-wider">TEAM GHOST</h1>
      <p className="text-gray-400 text-sm mb-8">
        {mode === 'signin' ? 'Sign in to your account.' : 'First time? Claim your player below.'}
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3 w-full max-w-md">
        {mode === 'claim' && (
          <input
            className={inputCls}
            placeholder="Your player name (as shown to the team)"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            autoComplete="nickname"
            required
          />
        )}
        <input
          className={inputCls}
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className={inputCls}
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
        />
        {error && (
          <div className="p-3 rounded-xl bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="p-4 rounded-xl font-bold text-lg bg-emerald-600 text-white shadow-lg active:scale-95 disabled:opacity-50"
        >
          {busy ? 'Working...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
      <button
        onClick={() => { setMode(mode === 'signin' ? 'claim' : 'signin'); setError(null); }}
        className="mt-6 text-sm text-gray-400 underline"
      >
        {mode === 'signin'
          ? "Don't have an account yet? Claim your player."
          : 'Already have an account? Sign in.'}
      </button>
    </div>
  );
};

export default LoginView;
