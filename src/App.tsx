/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, FloatingSubNote, FloatingPadConfig, ParagraphBlock, WordSize, TableData, TableColumn, TableRow, TableCell } from './types';
import { generateId } from './utils/helpers';
import { TopNavbar } from './components/TopNavbar';
import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { FloatingNotesPad } from './components/FloatingNotesPad';
import { ExportModal } from './components/ExportModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { AuthModal } from './components/AuthModal';
import { loadFileToNote } from './utils/fileLoader';
import { Cloud, Loader2 } from 'lucide-react';
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
  saveAllNotesToFirestore,
  saveNoteToFirestore,
  deleteNoteFromFirestore,
  loadUserNotesFromFirestore,
  createBlankNote,
} from './services/notesDb';
import { PasscodeLoginPage } from './components/PasscodeLoginPage';

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
  // Passcode gate
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('iclick4free_passcode_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  // Pure Firebase state - No local database
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState<boolean>(true);
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(true);
  const [activeNoteId, setActiveNoteId] = useState<string>('');

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

  // Wipe any legacy localStorage notes to prevent resurrected examples
  useEffect(() => {
    try {
      localStorage.removeItem('iclick4free_main_notes_v2');
      localStorage.removeItem('iclick4free_main_notes');
    } catch {}
  }, []);

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

  // Manual Save status ('saved' | 'unsaved' | 'saving')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const saveStatusRef = useRef<'saved' | 'unsaved' | 'saving'>('saved');
  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  const handleSignInPasscode = useCallback(async () => {
    isExplicitlySignedOut.current = false;
    const email = 'passcode.workspace@noteflow.internal';
    const password = 'Teachmehowtodo-GGY-Passcode2026!';
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      await createUserWithEmailAndPassword(auth, email, password);
    }
  }, []);

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
        setIsLoadingNotes(true);
        try {
          // Direct load from Firebase Cloud Firestore - No local database
          const cloudNotes = await loadUserNotesFromFirestore(currentUser.uid);
          const normalized = cloudNotes.map(ensureNoteFloatingNotes);
          setNotes(normalized);
          setActiveNoteId((prevId) => {
            if (prevId && normalized.some((n) => n.id === prevId)) {
              return prevId;
            }
            return normalized[0]?.id || '';
          });
          setIsLoadingNotes(false);
          setIsSyncing(false);
          setIsAuthInitializing(false);

          // Real-time Firestore subscription (safe merge that never interrupts active writing)
          unsubscribeFirestore = subscribeUserNotes(
            currentUser.uid,
            (remoteNotes) => {
              if (remoteNotes.length === 0) return;

              // If user has unsaved local edits or a save is in flight, DO NOT overwrite with remote notes!
              // This strictly prevents cursor jumping, reset textareas, and character duplication while writing.
              if (saveStatusRef.current === 'unsaved' || saveStatusRef.current === 'saving') {
                return;
              }

              const normalized = remoteNotes.map(ensureNoteFloatingNotes);

              setNotes((prevNotes) => {
                const merged = [...prevNotes];
                let hasChanges = false;

                // Sync new or remotely updated notes
                for (const remote of normalized) {
                  const localIdx = merged.findIndex((n) => n.id === remote.id);
                  if (localIdx === -1) {
                    merged.push(remote);
                    hasChanges = true;
                  } else {
                    const local = merged[localIdx];
                    const isRemoteNewer = (remote.updatedAt || 0) > (local.updatedAt || 0);

                    if (isRemoteNewer) {
                      merged[localIdx] = remote;
                      hasChanges = true;
                    }
                  }
                }

                // Remove notes deleted remotely
                const remoteIds = new Set(normalized.map((n) => n.id));
                const filtered = merged.filter((n) => remoteIds.has(n.id));

                if (filtered.length !== merged.length) {
                  hasChanges = true;
                }

                const result = filtered.length !== merged.length ? filtered : (hasChanges ? merged : prevNotes);
                if (hasChanges) {
                  notesRef.current = result;
                }
                return result;
              });

              setIsSyncing(false);
            },
            (err) => {
              console.warn('Firestore subscription notice:', err);
              setIsSyncing(false);
            }
          );
        } catch (err) {
          console.warn('Initial cloud sync notice:', err);
          setIsLoadingNotes(false);
          setIsSyncing(false);
          setIsAuthInitializing(false);
        }
      } else {
        if (!isExplicitlySignedOut.current) {
          try {
            const wasUnlocked = localStorage.getItem('iclick4free_passcode_unlocked') === 'true';
            if (wasUnlocked) {
              await handleSignInPasscode();
              return;
            }
          } catch (e) {
            console.warn('Auto passcode reconnect notice:', e);
          }
        }
        setNotes([]);
        setActiveNoteId('');
        setIsLoadingNotes(false);
        setIsSyncing(false);
        setIsAuthInitializing(false);
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

  // Manual Save triggered by Save button or Ctrl+S / Cmd+S
  const handleManualSave = useCallback(async () => {
    if (!user) {
      setSaveStatus('saved');
      saveStatusRef.current = 'saved';
      return;
    }

    setSaveStatus('saving');
    saveStatusRef.current = 'saving';
    setIsSyncing(true);

    try {
      await saveAllNotesToFirestore(user.uid, notesRef.current);
      setSaveStatus('saved');
      saveStatusRef.current = 'saved';
    } catch (err) {
      console.error('Failed to save to Firestore:', err);
      setSaveStatus('unsaved');
      saveStatusRef.current = 'unsaved';
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  // Document selection switch
  const handleSelectNote = useCallback((id: string) => {
    setActiveNoteId(id);
  }, []);

  // Global Ctrl + S / Cmd + S listener to trigger manual save
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleManualSave]);

  // Warn user before leaving page if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatusRef.current === 'unsaved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
    if (user && saveStatusRef.current === 'unsaved') {
      saveAllNotesToFirestore(user.uid, notesRef.current).catch((err) =>
        console.error('Save before lock error:', err)
      );
    }
    try {
      localStorage.removeItem('iclick4free_passcode_unlocked');
    } catch {
      // ignore
    }
    setIsPasscodeUnlocked(false);
  }, [user]);

  const handleSignOut = async () => {
    if (user && saveStatusRef.current === 'unsaved') {
      try {
        await saveAllNotesToFirestore(user.uid, notesRef.current);
      } catch (err) {
        console.error('Save before signout error:', err);
      }
    }
    isExplicitlySignedOut.current = true;
    await signOut(auth);
  };

  // Create new document
  const handleCreateNewNote = async () => {
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

    const nextNotes = [newNote, ...notesRef.current];
    setNotes(nextNotes);
    notesRef.current = nextNotes;
    setActiveNoteId(newNote.id);
    setIsReadMode(false);

    // Save to Firestore if user is authenticated
    if (user) {
      setSaveStatus('saving');
      saveStatusRef.current = 'saving';
      saveAllNotesToFirestore(user.uid, nextNotes)
        .then(() => {
          setSaveStatus('saved');
          saveStatusRef.current = 'saved';
        })
        .catch((err) => {
          console.error('Failed to save new note to Firestore:', err);
          setSaveStatus('unsaved');
          saveStatusRef.current = 'unsaved';
        });
    } else {
      setSaveStatus('saved');
      saveStatusRef.current = 'saved';
    }
  };

  // Load local file into Noteflow (.md, .txt, .json, .csv, .tsv)
  const handleLoadFile = useCallback(
    async (file: File) => {
      try {
        const loadedNote = await loadFileToNote(file);
        const nextNotes = [loadedNote, ...notesRef.current];
        setNotes(nextNotes);
        notesRef.current = nextNotes;
        setActiveNoteId(loadedNote.id);
        setIsReadMode(false);

        // Immediate write to Firestore if authenticated
        if (user) {
          setSaveStatus('saving');
          saveStatusRef.current = 'saving';
          saveAllNotesToFirestore(user.uid, nextNotes)
            .then(() => {
              setSaveStatus('saved');
              saveStatusRef.current = 'saved';
            })
            .catch((err) => {
              console.error('Failed to load file to Firestore:', err);
              setSaveStatus('unsaved');
              saveStatusRef.current = 'unsaved';
            });
        } else {
          setSaveStatus('saved');
          saveStatusRef.current = 'saved';
        }
      } catch (err) {
        console.error('Failed to load file:', err);
      }
    },
    [user]
  );


  // Update active document locally (pure in-memory, ZERO background network write while typing!)
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
        notesRef.current = nextNotes;
        return nextNotes;
      });

      setSaveStatus('unsaved');
      saveStatusRef.current = 'unsaved';
    },
    [activeNoteId]
  );

  const handleDeleteNote = async (id: string) => {
    const remaining = notesRef.current.filter((n) => n.id !== id);
    const nextNotes = remaining.length > 0 ? remaining : [createBlankNote()];
    setNotes(nextNotes);
    notesRef.current = nextNotes;
    setActiveNoteId(nextNotes[0]?.id || '');

    if (user) {
      setSaveStatus('saving');
      saveStatusRef.current = 'saving';
      deleteNoteFromFirestore(user.uid, id, nextNotes)
        .then(() => {
          setSaveStatus('saved');
          saveStatusRef.current = 'saved';
        })
        .catch((err) => {
          console.error('Failed to delete note from Firestore:', err);
          setSaveStatus('unsaved');
          saveStatusRef.current = 'unsaved';
        });
    } else {
      setSaveStatus('saved');
      saveStatusRef.current = 'saved';
    }
  };

  const handleDuplicateNote = async (noteToDup: Note) => {
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

    const nextNotes = [duplicated, ...notesRef.current];
    setNotes(nextNotes);
    notesRef.current = nextNotes;
    setActiveNoteId(duplicated.id);

    if (user) {
      setSaveStatus('saving');
      saveStatusRef.current = 'saving';
      saveAllNotesToFirestore(user.uid, nextNotes)
        .then(() => {
          setSaveStatus('saved');
          saveStatusRef.current = 'saved';
        })
        .catch((err) => {
          console.error('Failed to save duplicated note to Firestore:', err);
          setSaveStatus('unsaved');
          saveStatusRef.current = 'unsaved';
        });
    } else {
      setSaveStatus('saved');
      saveStatusRef.current = 'saved';
    }
  };

  const handleTogglePin = async (id: string) => {
    const target = notes.find((n) => n.id === id);
    if (!target) return;
    const updated = { ...target, isPinned: !target.isPinned, updatedAt: Date.now() };
    const nextNotes = notes.map((n) => (n.id === id ? updated : n));

    setNotes(nextNotes);
    notesRef.current = nextNotes;

    if (user) {
      saveAllNotesToFirestore(user.uid, nextNotes).catch((err) =>
        console.error('Failed to update pin state in Firestore:', err)
      );
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

  // Connecting to Firebase initial check
  if (isAuthInitializing) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-400 font-sans">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-xs font-medium tracking-wide text-zinc-300">Connecting to Firebase...</p>
      </div>
    );
  }

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
          onSignInPasscode={handleSignInPasscode}
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

  // Loading notes from Firebase
  if (isLoadingNotes && user) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-400 font-sans">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-xs font-medium tracking-wide text-zinc-300">Loading your workspace from Firebase...</p>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white relative ${
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
        saveStatus={saveStatus}
        onManualSave={handleManualSave}
        onSignIn={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onLockApp={handleLockApp}
        onLoadFile={handleLoadFile}
      />

      {/* Mobile banner to remind user to sign in to access PC notes */}
      {!user && (
        <div className="sm:hidden flex items-center justify-between px-3 py-1.5 bg-emerald-950/40 border-b border-emerald-900/50 text-[11px] text-emerald-300">
          <div className="flex items-center gap-1.5 truncate">
            <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Local offline mode.</span>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="ml-2 px-2.5 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded text-[10px] shrink-0 transition-colors cursor-pointer shadow-sm"
          >
            Sync from PC
          </button>
        </div>
      )}

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
            onLoadFile={handleLoadFile}
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
            onLoadFile={handleLoadFile}
            onDeleteNote={handleDeleteNote}
            saveStatus={saveStatus}
            onManualSave={handleManualSave}
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
