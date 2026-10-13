import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
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

function sanitizeNoteForFirestore(note: Note): Record<string, unknown> {
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

export function subscribeUserNotes(
  userId: string,
  onUpdate: (notes: Note[]) => void,
  onError?: (err: Error) => void
): () => void {
  const collectionPath = `users/${userId}/notes`;
  const notesRef = collection(db, 'users', userId, 'notes');

  const unsubscribe = onSnapshot(
    notesRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      // Ignore local writes so typing is not interrupted by echo updates
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }

      const fetchedNotes: Note[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Note;
        fetchedNotes.push({
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

      // Sort pinned first, then by updatedAt desc
      fetchedNotes.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      });

      onUpdate(fetchedNotes);
    },
    (error) => {
      console.error('Error subscribing to notes from Firestore:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, collectionPath);
    }
  );

  return unsubscribe;
}

export async function saveNoteToFirestore(userId: string, note: Note): Promise<void> {
  const docPath = `users/${userId}/notes/${note.id}`;
  try {
    const noteRef = doc(db, 'users', userId, 'notes', note.id);
    const sanitized = sanitizeNoteForFirestore(note);
    await setDoc(noteRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteNoteFromFirestore(userId: string, noteId: string): Promise<void> {
  const docPath = `users/${userId}/notes/${noteId}`;
  try {
    const noteRef = doc(db, 'users', userId, 'notes', noteId);
    await deleteDoc(noteRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function syncLocalNotesToFirestore(userId: string, localNotes: Note[]): Promise<void> {
  const collectionPath = `users/${userId}/notes`;
  try {
    const existingSnap = await getDocs(collection(db, 'users', userId, 'notes'));
    const remoteDocs = new Map<string, { updatedAt?: number }>();
    existingSnap.docs.forEach((d) => {
      remoteDocs.set(d.id, d.data() as { updatedAt?: number });
    });

    // Upload local notes that are either missing in Firestore or newer than remote
    for (const note of localNotes) {
      const remote = remoteDocs.get(note.id);
      if (!remote || (note.updatedAt || 0) > (remote.updatedAt || 0)) {
        await saveNoteToFirestore(userId, note);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collectionPath);
  }
}

