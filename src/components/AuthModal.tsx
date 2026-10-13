import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  ShieldCheck,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Copy,
  Check,
  KeyRound,
  RefreshCw,
  LogIn,
  UserPlus,
} from 'lucide-react';
import type { User } from '../firebase';

interface AuthModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSignInGoogle: () => Promise<void>;
  onSignInAnonymous: () => Promise<void>;
  onSignInEmail: (email: string, pass: string) => Promise<void>;
  onSignUpEmail: (email: string, pass: string, displayName: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

type AuthTab = 'signin' | 'signup' | 'forgot' | 'profile';

function formatAuthError(err: unknown): string {
  if (!err) return 'An unexpected error occurred.';
  const code = (err as { code?: string })?.code || '';
  const msg = err instanceof Error ? err.message : String(err);

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups or use Email sign in.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled before completion.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please wait a few moments and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase console.';
    default:
      return msg.replace('Firebase: ', '');
  }
}

export const AuthModal: React.FC<AuthModalProps> = ({
  user,
  isOpen,
  onClose,
  onSignInGoogle,
  onSignInAnonymous,
  onSignInEmail,
  onSignUpEmail,
  onResetPassword,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingAction, setLoadingAction] = useState<
    'google' | 'guest' | 'email' | 'signup' | 'reset' | 'signout' | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  // Auto-switch to profile view if signed in permanently, or signin if not
  useEffect(() => {
    if (user && !user.isAnonymous) {
      setActiveTab('profile');
    } else {
      setActiveTab('signin');
    }
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleGoogle = async () => {
    try {
      setLoadingAction('google');
      setErrorMessage(null);
      await onSignInGoogle();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAnonymous = async () => {
    try {
      setLoadingAction('guest');
      setErrorMessage(null);
      await onSignInAnonymous();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    try {
      setLoadingAction('email');
      setErrorMessage(null);
      await onSignInEmail(email.trim(), password);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please provide an email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify and try again.');
      return;
    }
    try {
      setLoadingAction('signup');
      setErrorMessage(null);
      await onSignUpEmail(email.trim(), password, displayName.trim());
      onClose();
    } catch (err: unknown) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email address to receive reset instructions.');
      return;
    }
    try {
      setLoadingAction('reset');
      setErrorMessage(null);
      await onResetPassword(email.trim());
      setSuccessMessage(`Password reset link sent to ${email.trim()}. Please check your inbox.`);
    } catch (err: unknown) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSignOutClick = async () => {
    try {
      setLoadingAction('signout');
      await onSignOut();
      setActiveTab('signin');
    } catch (err: unknown) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const copyUidToClipboard = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const getUserInitials = (): string => {
    if (user?.displayName) {
      const parts = user.displayName.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'GS';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-100 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-white">
            <Cloud className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Firebase Cloud Account</h3>
            <p className="text-xs text-zinc-400">Save and synchronize documents & checklists</p>
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Success notification */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Anonymous status note if user is currently anonymous */}
        {user?.isAnonymous && activeTab !== 'profile' && (
          <div className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Syncing as Guest ({user.uid.slice(0, 6)}...)</span>
            </span>
            <button
              type="button"
              onClick={() => handleTabChange('profile')}
              className="text-[11px] underline text-amber-300 hover:text-white"
            >
              View Guest UID
            </button>
          </div>
        )}

        {/* PROFILE TAB (Signed In user) */}
        {activeTab === 'profile' && user ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-12 h-12 rounded-xl object-cover border border-zinc-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {getUserInitials()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">
                    {user.displayName || (user.isAnonymous ? 'Guest User' : 'Authenticated User')}
                  </h4>
                  <p className="text-xs text-zinc-400 truncate">
                    {user.email || 'No email associated (Guest Mode)'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {user.isAnonymous
                        ? 'Guest Sync Active'
                        : user.providerData?.[0]?.providerId === 'google.com'
                        ? 'Google Verified'
                        : 'Email Verified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* UID Box with Copy button */}
              <div className="pt-2 border-t border-zinc-850 flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="text-[11px] text-zinc-500">Firebase UID:</span>
                <button
                  type="button"
                  onClick={copyUidToClipboard}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer text-[11px]"
                  title="Copy User UID"
                >
                  <span className="truncate max-w-[150px]">{user.uid}</span>
                  {copiedUid ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-zinc-400" />
                  )}
                </button>
              </div>

              <p className="text-[11px] text-zinc-500 leading-normal">
                Your notes, interactive checklists, floating notes, and table files are safely secured with end-to-end Firestore database isolation.
              </p>
            </div>

            {/* Actions for signed in user */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleTabChange('signin')}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-medium text-zinc-200 hover:text-white border border-zinc-700 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Switch / Sign Into Another Account</span>
              </button>

              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={handleSignOutClick}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-red-950/40 hover:bg-red-950/70 text-xs font-medium text-red-300 hover:text-red-200 border border-red-900/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{loadingAction === 'signout' ? 'Signing Out...' : 'Sign Out / Disconnect'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* AUTHENTICATION FORMS: SIGN IN / SIGN UP / FORGOT PASSWORD */
          <div className="space-y-4">
            {/* Tab navigation */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-medium text-zinc-400">
              <button
                type="button"
                onClick={() => handleTabChange('signin')}
                className={`py-2 rounded-lg transition-all text-center cursor-pointer ${
                  activeTab === 'signin'
                    ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                    : 'hover:text-zinc-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('signup')}
                className={`py-2 rounded-lg transition-all text-center cursor-pointer ${
                  activeTab === 'signup'
                    ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                    : 'hover:text-zinc-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Google OAuth & 1-Click Guest Shortcuts */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loadingAction === 'google' ? 'Connecting Google...' : 'Continue with Google'}</span>
              </button>

              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={handleAnonymous}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{loadingAction === 'guest' ? 'Connecting Guest Cloud...' : 'Instant 1-Click Guest Cloud Sync'}</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-zinc-800 w-full" />
              <span className="bg-zinc-900 px-3 text-[11px] text-zinc-500 font-mono uppercase tracking-wider shrink-0">
                Or with Email
              </span>
            </div>

            {/* TAB: SIGN IN */}
            {activeTab === 'signin' && (
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Email Address</label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 absolute left-3 text-zinc-500 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      autoComplete="email"
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">Password</label>
                    <button
                      type="button"
                      onClick={() => handleTabChange('forgot')}
                      className="text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 absolute left-3 text-zinc-500 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full pl-9 pr-9 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingAction !== null}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loadingAction === 'email' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                  <span>{loadingAction === 'email' ? 'Signing In...' : 'Sign In with Email'}</span>
                </button>
              </form>
            )}

            {/* TAB: SIGN UP */}
            {activeTab === 'signup' && (
              <form onSubmit={handleEmailSignUp} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Full Name (optional)</label>
                  <div className="relative flex items-center">
                    <UserIcon className="w-4 h-4 absolute left-3 text-zinc-500 pointer-events-none" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Alex Developer"
                      autoComplete="name"
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Email Address</label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 absolute left-3 text-zinc-500 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      autoComplete="email"
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Password (min 6 characters)</label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 absolute left-3 text-zinc-500 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      className="w-full pl-9 pr-9 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Confirm Password</label>
                  <div className="relative flex items-center">
                    <KeyRound className="w-4 h-4 absolute left-3 text-zinc-500 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      className="w-full pl-9 pr-9 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingAction !== null}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loadingAction === 'signup' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  <span>{loadingAction === 'signup' ? 'Creating Account...' : 'Create Free Account'}</span>
                </button>
              </form>
            )}

            {/* TAB: FORGOT PASSWORD */}
            {activeTab === 'forgot' && (
              <form onSubmit={handlePasswordReset} className="space-y-3">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 leading-relaxed">
                  Enter your registered email address. We will send you a secure link to reset your account password.
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Email Address</label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 absolute left-3 text-zinc-500 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      autoComplete="email"
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingAction !== null}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loadingAction === 'reset' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  <span>{loadingAction === 'reset' ? 'Sending Link...' : 'Send Password Reset Link'}</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => handleTabChange('signin')}
                    className="text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* Security Guarantee badge */}
            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>Multi-tenant Firestore Security & Encryption</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
