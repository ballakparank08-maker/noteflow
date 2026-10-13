import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Sparkles,
  LogIn,
} from 'lucide-react';

interface PasscodeLoginPageProps {
  onUnlock: () => void;
  onOpenAuth?: () => void;
  onSignInGoogle?: () => Promise<void>;
  onSignInGuest?: () => Promise<void>;
  onSignInPasscode?: (code: string) => Promise<void>;
}

export const REQUIRED_PASSCODE = 'Teachmehowtodo-GGY';

export const isPasscodeValid = (input: string): boolean => {
  const trimmed = input.trim();
  return (
    trimmed === 'Teachmehowtodo-GGY' ||
    trimmed === 'Teachmehowtodo-GGY..' ||
    trimmed === 'Teachmehowtodo-GGY.'
  );
};

export const PasscodeLoginPage: React.FC<PasscodeLoginPageProps> = ({
  onUnlock,
  onOpenAuth,
  onSignInGoogle,
  onSignInGuest,
  onSignInPasscode,
}) => {
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | 'guest' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passcode.trim()) {
      setError('Please enter the passcode to continue.');
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    // Validate passcode
    if (isPasscodeValid(passcode)) {
      try {
        if (onSignInPasscode) {
          await onSignInPasscode(passcode);
        }
        onUnlock();
      } catch (err: unknown) {
        setIsSubmitting(false);
        setError(err instanceof Error ? err.message : 'Workspace connection failed');
        inputRef.current?.focus();
      }
    } else {
      setIsSubmitting(false);
      setError('Incorrect passcode. Please verify your code and try again.');
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  };

  const handleGoogleAuth = async () => {
    if (!onSignInGoogle) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    try {
      setIsSocialLoading('google');
      setError(null);
      await onSignInGoogle();
      try {
        localStorage.setItem('iclick4free_passcode_unlocked', 'true');
      } catch {}
      onUnlock();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign in failed');
    } finally {
      setIsSocialLoading(null);
    }
  };

  const handleGuestAuth = async () => {
    if (!onSignInGuest) {
      onUnlock();
      return;
    }
    try {
      setIsSocialLoading('guest');
      setError(null);
      await onSignInGuest();
      try {
        localStorage.setItem('iclick4free_passcode_unlocked', 'true');
      } catch {}
      onUnlock();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Guest access failed');
    } finally {
      setIsSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-zinc-950 text-zinc-100 flex flex-col justify-between items-center p-4 sm:p-6 relative select-none font-sans">
      {/* Subtle ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-zinc-800/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Top brand header */}
      <header className="w-full max-w-5xl flex items-center justify-between py-4 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-bold text-sm shadow-md">
            iC
          </div>
          <span className="text-lg font-bold tracking-tight text-white">iClick4free</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Firebase & Passcode Protected</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md my-auto z-10">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-white mb-1 shadow-inner">
              <Lock className="w-6 h-6 text-zinc-300" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Unlock Workspace
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xs leading-relaxed">
              Sign in with your cloud account to sync notes across devices, or enter your workspace passcode.
            </p>
          </div>

          {/* Cross-device sync prompt */}
          <div className="w-full p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-[11px] text-emerald-300 leading-relaxed flex items-start gap-2 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Cross-Device Sync:</strong> Sign in with Google or Email below to instantly load and edit notes from your PC on mobile.
            </span>
          </div>

          {/* Firebase Fast Login Buttons */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={isSocialLoading !== null}
              onClick={handleGoogleAuth}
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
              <span>{isSocialLoading === 'google' ? 'Connecting Google...' : 'Continue with Google'}</span>
            </button>

            {onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sign In / Create Account with Email</span>
              </button>
            )}
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-800 w-full" />
            <span className="bg-zinc-900 px-3 text-[11px] text-zinc-500 font-mono uppercase tracking-wider shrink-0">
              Or with Passcode
            </span>
          </div>

          {/* Passcode Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="passcode-input" className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                <span>Passcode</span>
                <span className="text-[11px] text-zinc-500 font-mono">Workspace Code</span>
              </label>

              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-zinc-500 pointer-events-none">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  ref={inputRef}
                  id="passcode-input"
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter passcode..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className={`w-full pl-10 pr-11 py-3 bg-zinc-950 border rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-all font-mono ${
                    error
                      ? 'border-red-500/80 ring-1 ring-red-500/50'
                      : 'border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 p-1 text-zinc-500 hover:text-zinc-300 rounded-lg transition-colors cursor-pointer"
                  title={showPasscode ? 'Hide passcode' : 'Show passcode'}
                  tabIndex={-1}
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full py-3 px-4 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 active:scale-[0.99] rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <span>Unlock Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick pass hint note & Guest shortcut */}
          <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <button
                type="button"
                onClick={handleGuestAuth}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Instant Guest Access</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasscode(REQUIRED_PASSCODE);
                  setError(null);
                  inputRef.current?.focus();
                }}
                className="text-zinc-400 hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
              >
                Auto-fill Passcode
              </button>
            </div>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 mt-6 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            Full Screen & Read Mode
          </span>
          <span className="text-zinc-700">·</span>
          <span>Interactive Checklists</span>
          <span className="text-zinc-700">·</span>
          <span>Cloud & Local Sync</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl py-4 text-center text-xs text-zinc-600 font-mono">
        iClick4free · Distraction-free Document & Checklist Suite
      </footer>
    </div>
  );
};
