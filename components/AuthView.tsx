import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../lib/firebaseClient';
import { execute } from '../lib/tidbClient';
import { GoogleIcon, EyeIcon, EyeOffIcon } from './icons';
import { useStatus } from '../contexts/StatusContext';

type AuthMode = 'signIn' | 'signUp';

const AuthView: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { setError } = useStatus();

  const loading = emailLoading || googleLoading;

  const handleAuthAction = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailLoading(true);
    setError(null);

    console.log(`Attempting ${mode} with email: ${email}`);

    try {
      if (mode === 'signIn') {
        const result = await signInWithEmailAndPassword(auth, email, password);
        console.log("Sign in successful:", result.user.uid);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Sign up successful:", userCredential.user.uid);
        // Create initial profile in TiDB
        await execute(
          'INSERT IGNORE INTO profiles (id, email, username) VALUES (?, ?, ?)',
          [userCredential.user.uid, userCredential.user.email || '', '']
        );
      }
    } catch (error: any) {
      console.warn("Auth error (handled):", error.code);
      // console.log("Auth error details:", error); // Optional: keep full object in log if needed
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') msg = 'Email already exists.';
      if (error.code === 'auth/wrong-password') msg = 'Invalid password.';
      if (error.code === 'auth/user-not-found') msg = 'User not found.';
      if (error.code === 'auth/weak-password') msg = 'Password should be at least 6 characters.';
      if (error.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
      if (error.code === 'auth/too-many-requests') msg = 'Too many failed attempts. Try again later.';
      setError(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      console.error("Reset password error:", error);
      setError(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      auth.useDeviceLanguage();

      const result = await signInWithPopup(auth, provider);
      console.log("Google Sign in successful:", result.user.uid);

      // Check/Create profile in TiDB
      const existing = await execute('SELECT id FROM profiles WHERE id = ?', [result.user.uid]);
      if (existing.length === 0) {
        let finalUsername = result.user.displayName || '';
        if (finalUsername) {
          // Check if username is taken
          const taken = await execute('SELECT id FROM profiles WHERE username = ?', [finalUsername]);
          if (taken.length > 0) {
            console.warn("Google username taken, initializing with empty username.");
            finalUsername = ''; // Force user to set it later
          }
        }

        await execute(
          'INSERT INTO profiles (id, email, username) VALUES (?, ?, ?)',
          [result.user.uid, result.user.email || '', finalUsername]
        );
      }

    } catch (error: any) {
      console.error("Google Sign-In Error:", error);

      if (error.code === 'auth/unauthorized-domain') {
        let currentDomain = window.location.hostname;
        if (!currentDomain) currentDomain = window.location.host;
        setError(`Configuration Error: The domain "${currentDomain}" is not authorized. Go to Firebase Console > Authentication > Settings > Authorized Domains and add this domain.`);
      } else {
        setError(error.message || "Google Sign-In failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setGoogleLoading(true); // Reuse google loading for simplicity
    setError(null);
    try {
      const result = await signInAnonymously(auth);
      console.log("Guest login successful:", result.user.uid);

      // Check/Create profile in TiDB Logic for guest
      const randomId = Math.floor(Math.random() * 10000);
      await execute(
        'INSERT IGNORE INTO profiles (id, email, username) VALUES (?, ?, ?)',
        [result.user.uid, '', `Guest_${randomId}`]
      );
    } catch (error: any) {
      console.error("Guest login error", error);
      setError("Guest login failed.");
    } finally {
      setGoogleLoading(false);
    }
  };


  return (
    <div className="w-full max-w-md mx-auto perspective-1000">
      <div className="glass-panel border border-[var(--glass-border)] rounded-3xl shadow-xl p-8 backdrop-blur-xl relative overflow-hidden group hover:rotate-x-1 transition-transform duration-500">

        {/* Holographic Scanline Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(99,102,241,0.03)_50%,transparent_100%)] animate-scan pointer-events-none"></div>

        {/* Header Tabs */}
        <div className="flex border-b border-[var(--glass-border)] mb-8 relative p-1 bg-[var(--bg-color)]/20 rounded-xl">
          <button
            onClick={() => setMode('signIn')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-lg focus:outline-none ${mode === 'signIn' ? 'bg-[var(--glass-surface)] text-primary shadow-inner' : 'text-slate-500 hover:text-primary'}`}
          >
            Access
          </button>
          <button
            onClick={() => setMode('signUp')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-lg focus:outline-none ${mode === 'signUp' ? 'bg-[var(--glass-surface)] text-primary shadow-inner' : 'text-slate-500 hover:text-primary'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleAuthAction} className="space-y-5 relative z-10">
          <div className="space-y-1.5">
            <label className="block text-primary opacity-80 text-[10px] uppercase tracking-wider font-bold pl-1" htmlFor="email">
              Identity Protocol (Email)
            </label>
            <div className="relative group/input">
              <input
                id="email"
                className="w-full px-4 py-4 bg-slate-900 border border-[var(--glass-border)] rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder-slate-500 font-mono text-sm group-hover/input:border-primary/30"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@spark.node"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center pr-1">
              <label className="block text-primary opacity-80 text-[10px] uppercase tracking-wider font-bold pl-1" htmlFor="password">
                Security Key (Password)
              </label>
              {mode === 'signIn' && (
                <button type="button" onClick={handleForgotPassword} className="text-[10px] text-slate-500 hover:text-primary transition-colors cursor-pointer uppercase tracking-wider font-bold">
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative group/input">
              <input
                id="password"
                className="w-full px-4 py-4 bg-slate-900 border border-[var(--glass-border)] rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder-slate-500 font-mono text-sm group-hover/input:border-primary/30 pr-12"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white focus:outline-none"
              >
                {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 bg-primary hover:opacity-90 rounded-xl text-black text-sm font-bold tracking-[0.2em] uppercase transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center relative overflow-hidden group/btn mt-4"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
            {emailLoading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
            ) : (
              <span className="relative">{mode === 'signIn' ? 'Authenticate' : 'Initialize'}</span>
            )}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-white/5" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
            <span className="px-3 bg-transparent backdrop-blur-xl text-slate-600">Encrypted Uplink</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
            className="w-full py-4 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-3 group/google"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <GoogleIcon className="w-5 h-5 grayscale group-hover/google:grayscale-0 transition-all duration-300 opacity-70 group-hover/google:opacity-100" />
                <span className="text-xs tracking-wide font-bold uppercase text-slate-300 group-hover/google:text-white">Google Credentials</span>
              </>
            )}
          </button>
        </div>

      </div>
      <style>{`
        .perspective - 1000 { perspective: 1000px; }
      @keyframes scan {
        0 % { transform: translateY(-100 %); }
        100 % { transform: translateY(100 %); }
      }
        .animate - scan {
  animation: scan 3s linear infinite;
}
`}</style>
    </div>
  );
};

export default AuthView;
