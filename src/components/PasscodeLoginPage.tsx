import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ArrowRight, Lock, Eye, EyeOff, AlertCircle, KeyRound, Sparkles } from 'lucide-react';

interface PasscodeLoginPageProps {
  onUnlock: () => void;
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

export const PasscodeLoginPage: React.FC<PasscodeLoginPageProps> = ({ onUnlock }) => {
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
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
        localStorage.setItem('iclick4free_passcode_unlocked', 'true');
      } catch {
        // Handle storage quota / iframe sandbox
      }
      onUnlock();
    } else {
      setIsSubmitting(false);
      setError('Incorrect passcode. Please verify your code and try again.');
      inputRef.current?.focus();
      inputRef.current?.select();
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
          <span>Passcode Protected</span>
        </div>
      </header>

      {/* Main Login Card (No email, no password, ONLY passcode) */}
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
              No email or password required. Enter your passcode to access your documents and checklists.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="passcode-input" className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                <span>Passcode</span>
                <span className="text-[11px] text-zinc-500 font-mono">Required</span>
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
              className="mt-2 w-full py-3 px-4 bg-white text-zinc-950 hover:bg-zinc-200 active:scale-[0.99] rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <span>Unlock Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick pass hint note */}
          <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>Passcode Protected</span>
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
