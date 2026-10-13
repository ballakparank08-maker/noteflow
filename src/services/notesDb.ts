import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Note, ParagraphBlock } from '../types';

function sanitizeParagraphForFirestore(p: ParagraphBlock): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: p.id,
    text: p.text || '',
    isChecklist: Boolean(p.isChecklist),
    checked: Boolean(p.checked),
    type: p.type || 'p',
  };

  if (p.tableData) {
    result.tableData = {
      columns: (p.tableData.columns || []).map((col) => ({
        id: col.id,
        title: col.title || '',
        isChecklist: Boolean(col.isChecklist),
      })),
      rows: (p.tableData.rows || []).map((row) => ({
        id: row.id,
        cells: (row.cells || []).map((cell) => {
          const cResult: Record<string, unknown> = {
            id: cell.id,
            text: cell.text || '',
            isChecklist: Boolean(cell.isChecklist),
            checked: Boolean(cell.checked),
          };
          if (cell.file) {
            cResult.file = {
              name: cell.file.name || 'file',
              size: Number(cell.file.size) || 0,
              type: cell.file.type || '',
              ...(cell.file.dataUrl ? { dataUrl: cell.file.dataUrl } : {}),
            };
          }
          return cResult;
        }),
      })),
    };
  }

  return result;
}

export function sanitizeNoteForFirestore(note: Note): Record<string, unknown> {
  return {
    id: note.id,
    title: note.title || 'Untitled Document',
    isPinned: Boolean(note.isPinned),
    category: note.category || 'General',
    createdAt: note.createdAt || Date.now(),
    updatedAt: note.updatedAt || Date.now(),
    paragraphs: (note.paragraphs || []).map(sanitizeParagraphForFirestore),
    floatingNotes: (note.floatingNotes || []).map((fn) => ({
      id: fn.id,
      title: fn.title || 'Side Note',
      updatedAt: fn.updatedAt || Date.now(),
      paragraphs: (fn.paragraphs || []).map(sanitizeParagraphForFirestore),
    })),
  };
}

export function createBlankNote(): Note {
  const noteId = `note-${Date.now()}`;
  return {
    id: noteId,
    title: 'Untitled Document',
    isPinned: false,
    category: 'General',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    paragraphs: [
      {
        id: `p-${Date.now()}`,
        text: '',
        isChecklist: false,
        checked: false,
        type: 'p',
      },
    ],
    floatingNotes: [],
  };
}

/**
 * Loads notes directly from Firebase Cloud Firestore for the authenticated user.
 * 100% Firebase - No local database.
 * If user has no document yet, initializes with 1 blank note.
 * Never resurrects deleted example notes.
 */
export async function loadUserNotesFromFirestore(userId: string): Promise<Note[]> {
  if (!userId) return [createBlankNote()];

  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.notes)) {
        if (data.notes.length === 0) {
          // User explicitly deleted all notes - provide a single clean blank note
          const blank = createBlankNote();
          await saveAllNotesToFirestore(userId, [blank]);
          return [blank];
        }

        const notes: Note[] = (data.notes as Note[]).map((d) => ({
          id: d.id,
          title: d.title || 'Untitled Document',
          isPinned: Boolean(d.isPinned),
          category: d.category || 'General',
          createdAt: d.createdAt || Date.now(),
          updatedAt: d.updatedAt || Date.now(),
          paragraphs: d.paragraphs || [],
          floatingNotes: d.floatingNotes || [],
        }));

        notes.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.updatedAt - a.updatedAt;
        });

        return notes;
      }
    }

    // Brand new user in Firestore: create a single blank note
    const freshNotes = [createBlankNote()];
    await saveAllNotesToFirestore(userId, freshNotes);
    return freshNotes;
  } catch (error) {
    console.error('Failed to load notes from Firestore:', error);
    return [createBlankNote()];
  }
}

/**
 * Persists all user notes directly to doc(db, 'users', userId) in Firebase Cloud Firestore.
 * Single source of truth.
 */
export async function saveAllNotesToFirestore(userId: string, notes: Note[]): Promise<void> {
  if (!userId) return;
  const userDocRef = doc(db, 'users', userId);
  const sanitizedNotes = notes.map(sanitizeNoteForFirestore);

  try {
    await setDoc(
      userDocRef,
      {
        notes: sanitizedNotes,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn(`Firestore save notice for users/${userId}:`, error);
  }
}

/**
 * Saves a single note in Firestore.
 */
export async function saveNoteToFirestore(
  userId: string,
  note: Note,
  allNotes?: Note[]
): Promise<void> {
  if (!userId) return;

  if (allNotes && allNotes.length > 0) {
    const updated = allNotes.map((n) => (n.id === note.id ? note : n));
    if (!updated.some((n) => n.id === note.id)) {
      updated.push(note);
    }
    await saveAllNotesToFirestore(userId, updated);
    return;
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    let existingNotes: Note[] = [];
    if (snap.exists() && Array.isArray(snap.data()?.notes)) {
      existingNotes = snap.data().notes as Note[];
    }
    const idx = existingNotes.findIndex((n) => n.id === note.id);
    if (idx >= 0) {
      existingNotes[idx] = note;
    } else {
      existingNotes.push(note);
    }
    await saveAllNotesToFirestore(userId, existingNotes);
  } catch (err) {
    console.warn('saveNoteToFirestore notice:', err);
  }
}

/**
 * Deletes a note from Firestore.
 */
export async function deleteNoteFromFirestore(
  userId: string,
  noteId: string,
  remainingNotes?: Note[]
): Promise<void> {
  if (!userId) return;

  if (remainingNotes) {
    await saveAllNotesToFirestore(userId, remainingNotes);
    return;
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists() && Array.isArray(snap.data()?.notes)) {
      const existing = (snap.data().notes as Note[]).filter((n) => n.id !== noteId);
      await saveAllNotesToFirestore(userId, existing);
    }
  } catch (err) {
    console.warn('deleteNoteFromFirestore notice:', err);
  }
}

/**
 * Real-time listener for user notes in Firebase Firestore.
 */
export function subscribeUserNotes(
  userId: string,
  onUpdate: (notes: Note[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) return () => {};

  const userDocRef = doc(db, 'users', userId);

  const unsubUserDoc = onSnapshot(
    userDocRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }

      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data?.notes)) {
          const fetchedNotes: Note[] = (data.notes as Note[]).map((d) => ({
            id: d.id,
            title: d.title || 'Untitled Document',
            isPinned: Boolean(d.isPinned),
            category: d.category || 'General',
            createdAt: d.createdAt || Date.now(),
            updatedAt: d.updatedAt || Date.now(),
            paragraphs: d.paragraphs || [],
            floatingNotes: d.floatingNotes || [],
          }));

          fetchedNotes.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.updatedAt - a.updatedAt;
          });

          onUpdate(fetchedNotes);
        }
      }
    },
    (error) => {
      console.warn('Firestore subscription notice:', error);
      if (onError) onError(error);
    }
  );

  return unsubUserDoc;
}
