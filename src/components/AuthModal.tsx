import React, { useState } from 'react';
import { X, Cloud, ShieldCheck, LogOut, CheckCircle2, AlertCircle, Sparkles, User as UserIcon } from 'lucide-react';
import type { User } from '../firebase';

interface AuthModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSignInGoogle: () => Promise<void>;
  onSignInAnonymous: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  user,
  isOpen,
  onClose,
  onSignInGoogle,
  onSignInAnonymous,
  onSignOut,
}) => {
  const [loadingAction, setLoadingAction] = useState<'google' | 'guest' | 'signout' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogle = async () => {
    try {
      setLoadingAction('google');
      setErrorMessage(null);
      await onSignInGoogle();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-blocked')) {
        setErrorMessage('Browser blocked popup window. Please try "Instant Guest Cloud" or allow popups.');
      } else {
        setErrorMessage('Unable to connect with Google. You can use Instant Cloud Sync instead.');
      }
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
      setErrorMessage(err instanceof Error ? err.message : 'Failed to connect to cloud database.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoadingAction('signout');
      await onSignOut();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Sign out failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-100 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Close database modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
            <Cloud className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Database Cloud Sync</h3>
            <p className="text-xs text-zinc-400">Save and synchronize your notes securely</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {user ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Connected to Cloud Database (Firestore)</span>
              </div>
              <div className="text-xs text-zinc-300 font-mono flex items-center gap-2 pt-1">
                <UserIcon className="w-3.5 h-3.5 text-zinc-500" />
                <span className="truncate">{user.displayName || user.email || `Guest (${user.uid.slice(0, 8)}...)`}</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Your notes, paragraph checklists, and floating side-notes are securely saved to your personal database.
              </p>
            </div>

            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-200 hover:text-white border border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{loadingAction === 'signout' ? 'Disconnecting...' : 'Disconnect Database'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Connect to the live database so all your documents, checklist statuses, and side-notes are preserved across sessions and devices.
            </p>

            <div className="space-y-2.5 pt-1">
              {/* Google Sign-in Option */}
              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>{loadingAction === 'google' ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>

              {/* Instant Guest / Anonymous Option */}
              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={handleAnonymous}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{loadingAction === 'guest' ? 'Initializing Cloud...' : 'Instant 1-Click Cloud Sync'}</span>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>Encrypted Firestore storage with strict user isolation</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
