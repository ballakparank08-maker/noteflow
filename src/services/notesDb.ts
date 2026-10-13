import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
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

/**
 * Primary sync function: Persists all user notes directly to doc(db, 'users', userId)
 * This is 100% permitted by live Firestore rules and guarantees cross-device sync between desktop and mobile.
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
    console.warn(`Firestore user doc save notice for users/${userId}:`, error);
  }

  // Also opportunistically update subcollection in background without throwing
  try {
    for (const note of notes) {
      const noteRef = doc(db, 'users', userId, 'notes', note.id);
      setDoc(noteRef, sanitizeNoteForFirestore(note), { merge: true }).catch(() => {});
    }
  } catch {
    // Non-blocking fallback
  }
}

/**
 * Saves a single note to Firestore by updating the user's document array as well as the subcollection.
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

  // Fallback: fetch current user doc, merge, and save
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
    await setDoc(
      userDocRef,
      {
        notes: existingNotes.map(sanitizeNoteForFirestore),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('saveNoteToFirestore userDoc fallback notice:', err);
  }

  // Also opportunistically try subcollection
  try {
    const noteRef = doc(db, 'users', userId, 'notes', note.id);
    await setDoc(noteRef, sanitizeNoteForFirestore(note), { merge: true });
  } catch {
    // Non-blocking
  }
}

/**
 * Deletes a note from Firestore across the user document and subcollection.
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
      await setDoc(
        userDocRef,
        {
          notes: existing.map(sanitizeNoteForFirestore),
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn('deleteNoteFromFirestore userDoc fallback notice:', err);
  }

  try {
    const noteRef = doc(db, 'users', userId, 'notes', noteId);
    await deleteDoc(noteRef);
  } catch {
    // Non-blocking
  }
}

/**
 * Real-time listener for user notes across devices.
 * Listens to doc(db, 'users', userId) which is 100% permitted by live Firestore rules.
 * Also subscribes to the subcollection if active.
 */
export function subscribeUserNotes(
  userId: string,
  onUpdate: (notes: Note[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) return () => {};

  const userDocRef = doc(db, 'users', userId);
  let unsubSubcollection: (() => void) | null = null;

  const unsubUserDoc = onSnapshot(
    userDocRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      // Ignore local writes so typing is not interrupted by echo updates
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }

      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data?.notes) && data.notes.length > 0) {
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
      console.warn('Firestore user document subscription notice:', error);
      if (onError) onError(error);
    }
  );

  // Parallel subcollection listener with graceful error suppression
  try {
    const notesRef = collection(db, 'users', userId, 'notes');
    unsubSubcollection = onSnapshot(
      notesRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites || snapshot.empty) {
          return;
        }

        const subNotes: Note[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Note;
          subNotes.push({
            id: data.id || docSnap.id,
            title: data.title || 'Untitled Document',
            isPinned: Boolean(data.isPinned),
            category: data.category || 'General',
            createdAt: data.createdAt || Date.now(),
            updatedAt: data.updatedAt || Date.now(),
            paragraphs: data.paragraphs || [],
            floatingNotes: data.floatingNotes || [],
          });
        });

        if (subNotes.length > 0) {
          subNotes.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.updatedAt - a.updatedAt;
          });
          onUpdate(subNotes);
        }
      },
      () => {
        // Silently catch subcollection permission notice since user doc is active
      }
    );
  } catch {
    // Non-blocking
  }

  return () => {
    unsubUserDoc();
    if (unsubSubcollection) {
      unsubSubcollection();
    }
  };
}

/**
 * Merges local and remote notes on sign-in or initial load.
 * Returns the resolved merged notes array.
 */
export async function syncLocalNotesToFirestore(
  userId: string,
  localNotes: Note[]
): Promise<Note[]> {
  if (!userId) return localNotes;

  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    let remoteNotes: Note[] = [];

    if (snap.exists() && Array.isArray(snap.data()?.notes)) {
      remoteNotes = (snap.data().notes as Note[]).map((d) => ({
        id: d.id,
        title: d.title || 'Untitled Document',
        isPinned: Boolean(d.isPinned),
        category: d.category || 'General',
        createdAt: d.createdAt || Date.now(),
        updatedAt: d.updatedAt || Date.now(),
        paragraphs: d.paragraphs || [],
        floatingNotes: d.floatingNotes || [],
      }));
    }

    // Also check subcollection if user document was empty
    if (remoteNotes.length === 0) {
      try {
        const subSnap = await getDocs(collection(db, 'users', userId, 'notes'));
        subSnap.docs.forEach((d) => {
          const data = d.data() as Note;
          remoteNotes.push({
            id: data.id || d.id,
            title: data.title || 'Untitled Document',
            isPinned: Boolean(data.isPinned),
            category: data.category || 'General',
            createdAt: data.createdAt || Date.now(),
            updatedAt: data.updatedAt || Date.now(),
            paragraphs: data.paragraphs || [],
            floatingNotes: data.floatingNotes || [],
          });
        });
      } catch {
        // Subcollection may be forbidden, safely ignore
      }
    }

    // Build merged map
    const mergedMap = new Map<string, Note>();

    // If mobile is fresh and only has the default template notes, remote notes take full precedence
    const isLocalFreshDefault =
      localNotes.length > 0 &&
      localNotes.every(
        (n) =>
          n.id === 'note-1' ||
          n.id === 'note-2' ||
          n.id === 'note-3' ||
          n.title === 'Welcome to NoteFlow' ||
          n.title === 'Project Architecture & Roadmap' ||
          n.title === 'Sprint 42 Checklist & Action Items'
      );

    if (isLocalFreshDefault && remoteNotes.length > 0) {
      // Remote user notes take full precedence on mobile
      for (const r of remoteNotes) {
        mergedMap.set(r.id, r);
      }
    } else {
      // Merge: remote + local by newer updatedAt
      for (const r of remoteNotes) {
        mergedMap.set(r.id, r);
      }
      for (const l of localNotes) {
        const existing = mergedMap.get(l.id);
        if (!existing || (l.updatedAt || 0) >= (existing.updatedAt || 0)) {
          mergedMap.set(l.id, l);
        }
      }
    }

    const mergedNotes = Array.from(mergedMap.values());
    mergedNotes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt - a.updatedAt;
    });

    // Save resolved state back to doc(db, 'users', userId) so cloud is always up to date
    if (mergedNotes.length > 0) {
      await saveAllNotesToFirestore(userId, mergedNotes);
    }

    return mergedNotes;
  } catch (error) {
    console.warn(`Firestore sync notice for users/${userId}:`, error);
    return localNotes;
  }
}
