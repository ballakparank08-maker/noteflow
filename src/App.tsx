/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, FloatingSubNote, FloatingPadConfig, ParagraphBlock, WordSize, TableData, TableColumn, TableRow, TableCell } from './types';
import { INITIAL_MAIN_NOTES } from './data/defaultNotes';
import { generateId } from './utils/helpers';
import { TopNavbar } from './components/TopNavbar';
import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { FloatingNotesPad } from './components/FloatingNotesPad';
import { ExportModal } from './components/ExportModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { AuthModal } from './components/AuthModal';
import {
  auth,
  signInWithPopup,
  googleProvider,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from './firebase';
import {
  subscribeUserNotes,
  saveNoteToFirestore,
  deleteNoteFromFirestore,
  syncLocalNotesToFirestore,
} from './services/notesDb';
import { PasscodeLoginPage } from './components/PasscodeLoginPage';

const STORAGE_KEY_NOTES = 'iclick4free_main_notes_v2';
const STORAGE_KEY_CONFIG = 'iclick4free_floating_config_v2';
const STORAGE_KEY_WORDSIZE = 'iclick4free_word_size_v2';

function sanitizeTableData(td?: TableData): TableData | undefined {
  if (!td || !Array.isArray(td.columns)) return undefined;
  return {
    columns: td.columns.map((c: TableColumn, cIdx: number) => ({
      id: c?.id || `col-${cIdx}`,
      title: c?.title ?? '',
      isChecklist: Boolean(c?.isChecklist),
    })),
    rows: Array.isArray(td.rows)
      ? td.rows.map((r: TableRow, rIdx: number) => ({
          id: r?.id || `row-${rIdx}`,
          cells: Array.isArray(r?.cells)
            ? r.cells.map((cell: TableCell, cellIdx: number) => ({
                id: cell?.id || `cell-${cellIdx}`,
                text: cell?.text ?? '',
                isChecklist: Boolean(cell?.isChecklist),
                checked: Boolean(cell?.checked),
                file: cell?.file || undefined,
              }))
            : [],
        }))
      : [],
  };
}

function ensureNoteFloatingNotes(note: Note): Note {
  const safeParagraphs = Array.isArray(note.paragraphs)
    ? note.paragraphs.map((p, idx) => ({
        id: p?.id || `p-${note.id}-${idx}`,
        text: p?.text ?? '',
        isChecklist: Boolean(p?.isChecklist),
        checked: Boolean(p?.checked),
        type: p?.type || 'p',
        tableData: sanitizeTableData(p?.tableData),
      }))
    : [];

  const safeFloatingNotes = Array.isArray(note.floatingNotes) && note.floatingNotes.length > 0
    ? note.floatingNotes.map((fn, fIdx) => ({
        id: fn?.id || `fn-${note.id}-${fIdx}`,
        title: fn?.title || `Side Note ${fIdx + 1}`,
        updatedAt: typeof fn?.updatedAt === 'number' ? fn.updatedAt : Date.now(),
        paragraphs: Array.isArray(fn?.paragraphs) && fn.paragraphs.length > 0
          ? fn.paragraphs.map((fp, fpIdx) => ({
              id: fp?.id || `fp-${note.id}-${fIdx}-${fpIdx}`,
              text: fp?.text ?? '',
              isChecklist: Boolean(fp?.isChecklist),
              checked: Boolean(fp?.checked),
              type: fp?.type || 'p',
              tableData: sanitizeTableData(fp?.tableData),
            }))
          : [
              {
                id: `fp-${note.id}-${fIdx}-1`,
                text: '',
                isChecklist: false,
                checked: false,
                type: 'p' as const,
              },
            ],
      }))
    : [
        {
          id: `fn-${note.id || 'float'}-1`,
          title: 'Side Note 1',
          updatedAt: note.updatedAt || Date.now(),
          paragraphs: [
            {
              id: `fnp-${note.id || 'float'}-1`,
              text: `Quick side-note for "${note.title || 'Document'}"`,
              isChecklist: false,
              checked: false,
              type: 'p' as const,
            },
          ],
        },
      ];

  return {
    ...note,
    paragraphs: safeParagraphs,
    floatingNotes: safeFloatingNotes,
  };
}

function getInitialFloatingConfig(): FloatingPadConfig {
  const defaultPos = {
    x: typeof window !== 'undefined' && window.innerWidth > 1024 ? Math.max(20, window.innerWidth - 440) : 20,
    y: 100,
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        const posX = typeof parsed.position?.x === 'number' && Number.isFinite(parsed.position.x)
          ? parsed.position.x
          : defaultPos.x;
        const posY = typeof parsed.position?.y === 'number' && Number.isFinite(parsed.position.y)
          ? parsed.position.y
          : defaultPos.y;

        return {
          isOpen: typeof parsed.isOpen === 'boolean' ? parsed.isOpen : true,
          isMinimized: Boolean(parsed.isMinimized),
          activeNoteId: typeof parsed.activeNoteId === 'string' ? parsed.activeNoteId : '',
          position: { x: posX, y: posY },
          isGlass: Boolean(parsed.isGlass),
          isExpanded: Boolean(parsed.isExpanded),
        };
      }
    }
  } catch {
    // Fallback
  }

  return {
    isOpen: true,
    isMinimized: false,
    activeNoteId: '',
    position: defaultPos,
    isGlass: false,
    isExpanded: false,
  };
}

export default function App() {
  // Passcode gate (no email, no password, only passcode: Teachmehowtodo-GGY)
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('iclick4free_passcode_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  // Load initial notes from localStorage or defaults
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTES);
      if (saved) {
        const parsed = JSON.parse(saved) as Note[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(ensureNoteFloatingNotes);
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_MAIN_NOTES.map(ensureNoteFloatingNotes);
  });

  const [activeNoteId, setActiveNoteId] = useState<string>(() => {
    return notes[0]?.id || '';
  });

  // Database & User authentication state
  const [user, setUser] = useState<User | null>(null);
  const isExplicitlySignedOut = useRef<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Word size state (sm, base, lg, xl)
  const [wordSize, setWordSize] = useState<WordSize>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WORDSIZE);
      if (saved === 'sm' || saved === 'base' || saved === 'lg' || saved === 'xl') {
        return saved;
      }
    } catch {
      // Fallback
    }
    return 'base';
  });

  // Floating pad configuration (draggable coordinates, open/closed, minimized)
  const [floatingConfig, setFloatingConfig] = useState<FloatingPadConfig>(getInitialFloatingConfig);

  const handleUpdateFloatingConfig = useCallback((updates: Partial<FloatingPadConfig>) => {
    setFloatingConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const [currentFilter, setCurrentFilter] = useState<'all' | 'checklists' | 'pinned'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isReadMode, setIsReadMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reference to hold notes for syncing callbacks without stale closures
  const notesRef = useRef<Note[]>(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Sync notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
    } catch {
      // Quota handling
    }
  }, [notes]);

  // Sync floating pad config to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(floatingConfig));
    } catch {
      // Quota handling
    }
  }, [floatingConfig]);

  // Sync word size to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_WORDSIZE, wordSize);
    } catch {
      // Quota handling
    }
  }, [wordSize]);

  // Firebase Auth & Firestore live synchronization
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (currentUser) {
        setIsPasscodeUnlocked(true);
        try {
          localStorage.setItem('iclick4free_passcode_unlocked', 'true');
        } catch {}

        setIsSyncing(true);
        try {
          // Sync existing local notes to Firestore so nothing is lost
          await syncLocalNotesToFirestore(currentUser.uid, notesRef.current);

          // Subscribe to live updates from user's Firestore collection
          unsubscribeFirestore = subscribeUserNotes(
            currentUser.uid,
            (remoteNotes) => {
              if (remoteNotes.length > 0) {
                const normalized = remoteNotes.map(ensureNoteFloatingNotes);
                setNotes((prevNotes) => {
                  const merged = [...prevNotes];
                  for (const remote of normalized) {
                    const localIdx = merged.findIndex((n) => n.id === remote.id);
                    if (localIdx === -1) {
                      merged.push(remote);
                    } else {
                      const local = merged[localIdx];
                      const isLocallyPending = saveDebounceMap.current.has(remote.id);
                      const isLocalNewer = (local.updatedAt || 0) > (remote.updatedAt || 0);

                      // Avoid clobbering active keystrokes or newer local changes
                      if (!isLocallyPending && !isLocalNewer) {
                        merged[localIdx] = remote;
                      }
                    }
                  }
                  return merged;
                });

                setActiveNoteId((prevId) => {
                  return normalized.some((n) => n.id === prevId) ? prevId : normalized[0].id;
                });
              }
              setIsSyncing(false);
            },
            (err) => {
              console.error('Firestore sync error:', err);
              setIsSyncing(false);
            }
          );
        } catch (err) {
          console.error('Initial cloud sync error:', err);
          setIsSyncing(false);
        }
      } else {
        setIsSyncing(false);
        // Automatically start anonymous cloud sync if not explicitly signed out
        if (!isExplicitlySignedOut.current) {
          try {
            await signInAnonymously(auth);
          } catch (e) {
            console.warn('Anonymous cloud initialization skipped:', e);
          }
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  // Handle Fullscreen API state synchronization
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } else {
          setIsFullscreen((prev) => !prev);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        } else {
          setIsFullscreen((prev) => !prev);
        }
      }
    } catch {
      // Fallback for sandboxed iframes
      setIsFullscreen((prev) => !prev);
    }
  };

  // Active document
  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  // Floating side-notes scoped directly to the current main document
  const currentFloatingNotes: FloatingSubNote[] = React.useMemo(() => {
    if (activeNote?.floatingNotes && activeNote.floatingNotes.length > 0) {
      return activeNote.floatingNotes;
    }
    return [
      {
        id: `fn-${activeNote?.id || 'doc'}-1`,
        title: 'Side Note 1',
        updatedAt: activeNote?.updatedAt || Date.now(),
        paragraphs: [
          {
            id: `fnp-${activeNote?.id || 'doc'}-1`,
            text: `Quick side-note for "${activeNote?.title || 'Document'}"`,
            isChecklist: false,
            checked: false,
            type: 'p',
          },
        ],
      },
    ];
  }, [activeNote?.id, activeNote?.floatingNotes, activeNote?.title, activeNote?.updatedAt]);

  // Ref to debounce Firestore writes
  const saveDebounceMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Reliable flush of all pending in-memory and debounced saves to disk (localStorage) and cloud (Firestore)
  const flushPendingSaves = useCallback(() => {
    // 1. Immediately persist full notes array to localStorage
    try {
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notesRef.current));
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }

    // 2. Immediately execute any pending Firestore debounce writes
    if (user && saveDebounceMap.current.size > 0) {
      saveDebounceMap.current.forEach((timer, noteId) => {
        clearTimeout(timer);
        const noteToSave = notesRef.current.find((n) => n.id === noteId);
        if (noteToSave) {
          saveNoteToFirestore(user.uid, noteToSave).catch((err) =>
            console.error('Flush to Firestore error:', err)
          );
        }
      });
      saveDebounceMap.current.clear();
    }
  }, [user]);

  // Always-on debounced auto-save (saving is always active and reliable)
  const queueAutoSave = useCallback(
    (updatedNote: Note) => {
      const existing = saveDebounceMap.current.get(updatedNote.id);
      if (existing) {
        clearTimeout(existing);
      }

      const timer = setTimeout(async () => {
        try {
          try {
            localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notesRef.current));
          } catch (e) {
            console.error('LocalStorage write error:', e);
          }

          if (user) {
            const freshestNote =
              notesRef.current.find((n) => n.id === updatedNote.id) || updatedNote;
            await saveNoteToFirestore(user.uid, freshestNote);
          }
        } catch (err) {
          console.error('Failed to auto-save note:', err);
        } finally {
          saveDebounceMap.current.delete(updatedNote.id);
        }
      }, 350);

      saveDebounceMap.current.set(updatedNote.id, timer);
    },
    [user]
  );

  // Flush unsaved changes immediately on document switch
  const handleSelectNote = useCallback(
    (id: string) => {
      flushPendingSaves();
      setActiveNoteId(id);
    },
    [flushPendingSaves]
  );

  // Global Ctrl + S / Cmd + S listener to trigger instant save
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        flushPendingSaves();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [flushPendingSaves]);

  // Flush save on page visibility hidden, blur, pagehide, or beforeunload
  useEffect(() => {
    const handleFlush = () => {
      flushPendingSaves();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSaves();
      }
    };

    window.addEventListener('beforeunload', handleFlush);
    window.addEventListener('pagehide', handleFlush);
    window.addEventListener('blur', handleFlush);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleFlush);
      window.removeEventListener('pagehide', handleFlush);
      window.removeEventListener('blur', handleFlush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushPendingSaves]);

  // Auth actions
  const handleSignInGoogle = async () => {
    isExplicitlySignedOut.current = false;
    await signInWithPopup(auth, googleProvider);
  };

  const handleSignInAnonymous = async () => {
    isExplicitlySignedOut.current = false;
    await signInAnonymously(auth);
  };

  const handleSignInEmail = async (email: string, pass: string) => {
    isExplicitlySignedOut.current = false;
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const handleSignUpEmail = async (email: string, pass: string, displayName: string) => {
    isExplicitlySignedOut.current = false;
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
  };

  const handleResetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const handleLockApp = useCallback(() => {
    flushPendingSaves();
    try {
      localStorage.removeItem('iclick4free_passcode_unlocked');
    } catch {
      // ignore
    }
    setIsPasscodeUnlocked(false);
  }, [flushPendingSaves]);

  const handleSignOut = async () => {
    flushPendingSaves();
    isExplicitlySignedOut.current = true;
    await signOut(auth);
  };

  // Create new document
  const handleCreateNewNote = async () => {
    flushPendingSaves();
    const newNote: Note = {
      id: generateId('note'),
      title: 'Untitled Document',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      paragraphs: [
        {
          id: generateId('p'),
          text: '',
          isChecklist: false,
          checked: false,
          type: 'p',
        },
      ],
      floatingNotes: [
        {
          id: generateId('fn'),
          title: 'Side Note 1',
          updatedAt: Date.now(),
          paragraphs: [
            {
              id: generateId('fnp'),
              text: 'Quick side-note for this document.',
              isChecklist: false,
              checked: false,
              type: 'p',
            },
          ],
        },
      ],
    };

    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setIsReadMode(false);

    // Save to Firestore if user is authenticated
    if (user) {
      try {
        await saveNoteToFirestore(user.uid, newNote);
      } catch (err) {
        console.error('Failed to save new note to Firestore:', err);
      }
    }
  };

  // Update active document and save to Firestore & localStorage (debounced auto-save)
  const handleUpdateActiveNote = useCallback(
    (updates: Partial<Note>) => {
      setNotes((prev) => {
        const idx = prev.findIndex((n) => n.id === activeNoteId);
        if (idx === -1) return prev;
        const current = prev[idx];
        const updatedNote: Note = {
          ...current,
          ...updates,
          updatedAt: Date.now(),
        };
        const nextNotes = [...prev];
        nextNotes[idx] = updatedNote;
        queueAutoSave(updatedNote);
        return nextNotes;
      });
    },
    [activeNoteId, queueAutoSave]
  );

  const handleDeleteNote = async (id: string) => {
    flushPendingSaves();
    if (notes.length <= 1) return;
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    if (activeNoteId === id) {
      setActiveNoteId(remaining[0]?.id || '');
    }

    if (user) {
      try {
        await deleteNoteFromFirestore(user.uid, id);
      } catch (err) {
        console.error('Failed to delete note from Firestore:', err);
      }
    }
  };

  const handleDuplicateNote = async (noteToDup: Note) => {
    flushPendingSaves();
    const duplicated: Note = {
      ...noteToDup,
      id: generateId('note'),
      title: `${noteToDup.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      paragraphs: noteToDup.paragraphs.map((p) => ({
        ...p,
        id: generateId('p'),
      })),
      floatingNotes: (noteToDup.floatingNotes || []).map((fn) => ({
        ...fn,
        id: generateId('fn'),
        paragraphs: fn.paragraphs.map((p) => ({ ...p, id: generateId('fnp') })),
      })),
    };

    setNotes((prev) => [duplicated, ...prev]);
    setActiveNoteId(duplicated.id);

    if (user) {
      try {
        await saveNoteToFirestore(user.uid, duplicated);
      } catch (err) {
        console.error('Failed to save duplicated note to Firestore:', err);
      }
    }
  };

  const handleTogglePin = async (id: string) => {
    const target = notes.find((n) => n.id === id);
    if (!target) return;
    const updated = { ...target, isPinned: !target.isPinned, updatedAt: Date.now() };

    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));

    if (user) {
      try {
        await saveNoteToFirestore(user.uid, updated);
      } catch (err) {
        console.error('Failed to update pin state in Firestore:', err);
      }
    }
  };

  // Update this active document's small floating notes
  const handleUpdateActiveFloatingNotes = (updatedFloating: FloatingSubNote[]) => {
    if (!activeNote) return;
    handleUpdateActiveNote({
      floatingNotes: updatedFloating,
      updatedAt: Date.now(),
    });
  };

  // Clip a single paragraph block from the main document into its floating side-notes
  const handleSendParagraphToFloating = (block: ParagraphBlock) => {
    if (!activeNote) return;
    const currentList = currentFloatingNotes;
    const targetSubNote =
      currentList.find((n) => n.id === floatingConfig.activeNoteId) || currentList[0];

    const newParagraph: ParagraphBlock = {
      ...block,
      id: generateId('fp'),
    };

    let updatedNotes: FloatingSubNote[];
    let chosenId = targetSubNote?.id;

    if (targetSubNote) {
      updatedNotes = currentList.map((n) =>
        n.id === targetSubNote.id
          ? { ...n, paragraphs: [...n.paragraphs, newParagraph], updatedAt: Date.now() }
          : n
      );
    } else {
      chosenId = generateId('fn');
      updatedNotes = [
        {
          id: chosenId,
          title: 'Side Note 1',
          updatedAt: Date.now(),
          paragraphs: [newParagraph],
        },
      ];
    }

    handleUpdateActiveFloatingNotes(updatedNotes);
    setFloatingConfig((prev) => ({
      ...prev,
      isOpen: true,
      isMinimized: false,
      activeNoteId: chosenId,
    }));
  };

  // Pin a snippet of the current document into floating side-notes
  const handleSendWholeNoteToFloating = (note: Note) => {
    const newSubNote: FloatingSubNote = {
      id: generateId('fn'),
      title: `${note.title || 'Doc'} Snippet`,
      updatedAt: Date.now(),
      paragraphs: (note.paragraphs || []).map((p) => ({ ...p, id: generateId('fp') })),
    };

    handleUpdateActiveFloatingNotes([...currentFloatingNotes, newSubNote]);
    setFloatingConfig((prev) => ({
      ...prev,
      isOpen: true,
      isMinimized: false,
      activeNoteId: newSubNote.id,
    }));
  };

  // Inject a small side-note's paragraphs back into the current main document
  const handleAppendFloatingToMainDoc = (subNote: FloatingSubNote) => {
    if (!activeNote) return;
    const cloned = (subNote.paragraphs || []).map((p) => ({
      ...p,
      id: generateId('p'),
    }));

    handleUpdateActiveNote({
      paragraphs: [...(activeNote.paragraphs || []), ...cloned],
      updatedAt: Date.now(),
    });
  };

  // Filter notes based on top navigation selection
  const visibleNotes = notes.filter((n) => {
    if (currentFilter === 'pinned') return n.isPinned;
    if (currentFilter === 'checklists') return (n.paragraphs || []).some((p) => p && p.isChecklist);
    return true;
  });

  // If locked, present the passcode or Firebase login screen
  if (!isPasscodeUnlocked) {
    return (
      <>
        <PasscodeLoginPage
          onUnlock={() => setIsPasscodeUnlocked(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onSignInGoogle={async () => {
            await handleSignInGoogle();
            setIsPasscodeUnlocked(true);
          }}
          onSignInGuest={async () => {
            await handleSignInAnonymous();
            setIsPasscodeUnlocked(true);
          }}
        />
        <AuthModal
          user={user}
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSignInGoogle={async () => {
            await handleSignInGoogle();
            setIsPasscodeUnlocked(true);
          }}
          onSignInAnonymous={async () => {
            await handleSignInAnonymous();
            setIsPasscodeUnlocked(true);
          }}
          onSignInEmail={async (email, pass) => {
            await handleSignInEmail(email, pass);
            setIsPasscodeUnlocked(true);
          }}
          onSignUpEmail={async (email, pass, name) => {
            await handleSignUpEmail(email, pass, name);
            setIsPasscodeUnlocked(true);
          }}
          onResetPassword={handleResetPassword}
          onSignOut={handleSignOut}
        />
      </>
    );
  }

  return (
    <div
      className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white ${
        isFullscreen ? 'fixed inset-0 z-50 overflow-hidden' : ''
      }`}
    >
      {/* 3-Zone Top Navigation Contract */}
      <TopNavbar
        currentFilter={currentFilter}
        onFilterChange={setCurrentFilter}
        onCreateNewNote={handleCreateNewNote}
        isFloatingOpen={floatingConfig.isOpen}
        floatingNotesCount={currentFloatingNotes.length}
        onToggleFloating={() =>
          setFloatingConfig((prev) => ({
            ...prev,
            isOpen: !prev.isOpen,
            isMinimized: false,
          }))
        }
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        isReadMode={isReadMode}
        onToggleReadMode={() => setIsReadMode((prev) => !prev)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        wordSize={wordSize}
        onWordSizeChange={setWordSize}
        user={user}
        isSyncing={isSyncing}
        onSignIn={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onLockApp={handleLockApp}
      />

      {/* Main Workspace: Sidebar + Document Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar hidden in Read Mode for distraction-free reading */}
        {!isReadMode && (
          <Sidebar
            notes={visibleNotes}
            activeNoteId={activeNote?.id || ''}
            onSelectNote={handleSelectNote}
            onDeleteNote={handleDeleteNote}
            onDuplicateNote={handleDuplicateNote}
            onTogglePin={handleTogglePin}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            onLockApp={handleLockApp}
          />
        )}

        {activeNote ? (
          <NoteEditor
            note={activeNote}
            isReadMode={isReadMode}
            isFullscreen={isFullscreen}
            wordSize={wordSize}
            onToggleReadMode={() => setIsReadMode(false)}
            onUpdateNote={handleUpdateActiveNote}
            onSendToFloatingPad={handleSendParagraphToFloating}
            onSendWholeNoteToFloating={handleSendWholeNoteToFloating}
            onOpenExportModal={() => setShowExportModal(true)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-zinc-500">
            <p className="text-sm font-medium text-zinc-400">No document selected</p>
            <button
              type="button"
              onClick={handleCreateNewNote}
              className="mt-3 px-4 py-2 bg-white text-zinc-950 rounded-lg text-xs font-semibold hover:bg-zinc-200 cursor-pointer"
            >
              Create New Document
            </button>
          </div>
        )}
      </div>

      {/* Draggable Floating Notes (Side-notes derived from & attached to the active document!) */}
      <FloatingNotesPad
        notes={currentFloatingNotes}
        mainNoteTitle={activeNote?.title}
        config={floatingConfig}
        isReadMode={isReadMode}
        wordSize={wordSize}
        onUpdateConfig={handleUpdateFloatingConfig}
        onUpdateNotes={handleUpdateActiveFloatingNotes}
        onAppendToMainDoc={handleAppendFloatingToMainDoc}
      />

      {/* Modals */}
      {showExportModal && activeNote && (
        <ExportModal note={activeNote} onClose={() => setShowExportModal(false)} />
      )}

      {showShortcutsModal && (
        <ShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}

      {/* Database Connection & Auth Modal */}
      <AuthModal
        user={user}
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignInGoogle={handleSignInGoogle}
        onSignInAnonymous={handleSignInAnonymous}
        onSignInEmail={handleSignInEmail}
        onSignUpEmail={handleSignUpEmail}
        onResetPassword={handleResetPassword}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
