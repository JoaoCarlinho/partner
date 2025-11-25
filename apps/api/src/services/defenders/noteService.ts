/**
 * Defender Note Service
 * Handles case notes for public defenders with encryption and history tracking
 */

import { v4 as uuidv4 } from 'uuid';
import { messageEncryption } from './messageEncryption';

// Types
export type NoteCategory =
  | 'INITIAL_ASSESSMENT'
  | 'FINANCIAL_GUIDANCE'
  | 'COMMUNICATION_COACHING'
  | 'PLAN_RECOMMENDATIONS'
  | 'FOLLOW_UP_REQUIRED'
  | 'CASE_RESOLUTION'
  | 'GENERAL';

export interface DefenderNote {
  id: string;
  defenderId: string;
  assignmentId: string;
  category: NoteCategory;
  title: string;
  content: string; // Encrypted
  visibleToDebtor: boolean;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface NoteHistory {
  id: string;
  noteId: string;
  previousTitle?: string;
  previousContent: string;
  previousCategory?: NoteCategory;
  editedBy: string;
  editReason?: string;
  createdAt: Date;
}

export interface CreateNoteRequest {
  assignmentId: string;
  category: NoteCategory;
  title: string;
  content: string;
  visibleToDebtor?: boolean;
  pinned?: boolean;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  category?: NoteCategory;
  visibleToDebtor?: boolean;
  pinned?: boolean;
  editReason?: string;
}

export interface NoteFilters {
  category?: NoteCategory;
  pinned?: boolean;
  visibleToDebtor?: boolean;
  search?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface NoteResponse {
  id: string;
  assignmentId: string;
  category: NoteCategory;
  title: string;
  content: string;
  contentPreview: string;
  visibleToDebtor: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  hasEdits: boolean;
  defender?: {
    id: string;
    name: string;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Category metadata
export const NOTE_CATEGORY_META: Record<NoteCategory, { icon: string; color: string; label: string }> = {
  INITIAL_ASSESSMENT: { icon: '📋', color: '#3498db', label: 'Initial Assessment' },
  FINANCIAL_GUIDANCE: { icon: '💰', color: '#27ae60', label: 'Financial Guidance' },
  COMMUNICATION_COACHING: { icon: '💬', color: '#9b59b6', label: 'Communication Coaching' },
  PLAN_RECOMMENDATIONS: { icon: '📝', color: '#e67e22', label: 'Plan Recommendations' },
  FOLLOW_UP_REQUIRED: { icon: '⏰', color: '#e74c3c', label: 'Follow-up Required' },
  CASE_RESOLUTION: { icon: '✅', color: '#1abc9c', label: 'Case Resolution' },
  GENERAL: { icon: '📌', color: '#95a5a6', label: 'General' },
};

// In-memory stores for development
// Note: In production, use PostgreSQL/Prisma
const notesStore = new Map<string, DefenderNote>();
const historyStore = new Map<string, NoteHistory>();

// Mock assignment store reference
interface Assignment {
  id: string;
  defenderId: string;
  debtorId: string;
  status: string;
}

const mockAssignments = new Map<string, Assignment>();
mockAssignments.set('assign-001', {
  id: 'assign-001',
  defenderId: 'defender-001',
  debtorId: 'debtor-001',
  status: 'ACTIVE',
});

export class DefenderNoteService {
  /**
   * Create a new note
   */
  async createNote(
    request: CreateNoteRequest,
    defender: { id: string; name: string }
  ): Promise<NoteResponse> {
    // Validate assignment
    const assignment = mockAssignments.get(request.assignmentId);

    if (!assignment || assignment.defenderId !== defender.id) {
      throw new Error('Not assigned to this case');
    }

    if (assignment.status !== 'ACTIVE') {
      throw new Error('Assignment is not active');
    }

    // Encrypt content
    const encrypted = await messageEncryption.encryptMessage(request.content);

    // Create note
    const noteId = uuidv4();
    const now = new Date();

    const note: DefenderNote = {
      id: noteId,
      defenderId: defender.id,
      assignmentId: request.assignmentId,
      category: request.category,
      title: request.title,
      content: JSON.stringify(encrypted),
      visibleToDebtor: request.visibleToDebtor || false,
      pinned: request.pinned || false,
      createdAt: now,
      updatedAt: now,
    };

    notesStore.set(noteId, note);

    console.log(`[Audit] NOTE_CREATED by ${defender.id}: ${noteId}`);

    return this.formatNoteResponse(note, request.content, defender);
  }

  /**
   * Update an existing note
   */
  async updateNote(
    noteId: string,
    updates: UpdateNoteRequest,
    defender: { id: string; name: string }
  ): Promise<NoteResponse> {
    const note = notesStore.get(noteId);

    if (!note) {
      throw new Error('Note not found');
    }

    if (note.defenderId !== defender.id) {
      throw new Error('Cannot edit another defender\'s note');
    }

    if (note.deletedAt) {
      throw new Error('Cannot edit deleted note');
    }

    // Save history before update
    const historyId = uuidv4();
    const historyEntry: NoteHistory = {
      id: historyId,
      noteId: note.id,
      previousTitle: note.title,
      previousContent: note.content,
      previousCategory: note.category,
      editedBy: defender.id,
      editReason: updates.editReason,
      createdAt: new Date(),
    };
    historyStore.set(historyId, historyEntry);

    // Track visibility change for audit
    const visibilityChanged =
      updates.visibleToDebtor !== undefined &&
      updates.visibleToDebtor !== note.visibleToDebtor;

    // Update note
    let newContent = note.content;
    let decryptedContent: string;

    if (updates.content) {
      const encrypted = await messageEncryption.encryptMessage(updates.content);
      newContent = JSON.stringify(encrypted);
      decryptedContent = updates.content;
    } else {
      const encrypted = JSON.parse(note.content);
      decryptedContent = await messageEncryption.decryptMessage(encrypted);
    }

    note.title = updates.title ?? note.title;
    note.content = newContent;
    note.category = updates.category ?? note.category;
    note.visibleToDebtor = updates.visibleToDebtor ?? note.visibleToDebtor;
    note.pinned = updates.pinned ?? note.pinned;
    note.updatedAt = new Date();

    notesStore.set(noteId, note);

    // Log visibility change
    if (visibilityChanged) {
      const action = updates.visibleToDebtor
        ? 'NOTE_SHARED_WITH_DEBTOR'
        : 'NOTE_UNSHARED_FROM_DEBTOR';
      console.log(`[Audit] ${action} by ${defender.id}: ${noteId}`);
    }

    return this.formatNoteResponse(note, decryptedContent, defender);
  }

  /**
   * Get notes for an assignment
   */
  async getNotes(
    assignmentId: string,
    user: { id: string; role: string },
    filters: NoteFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResult<NoteResponse>> {
    const assignment = mockAssignments.get(assignmentId);

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    // Determine access level
    const isDefender = user.id === assignment.defenderId;
    const isDebtor = user.id === assignment.debtorId;

    if (!isDefender && !isDebtor) {
      throw new Error('Not authorized to view notes');
    }

    // Block creditors
    if (user.role === 'CREDITOR') {
      throw new Error('Creditors cannot access defender notes');
    }

    // Get all notes for assignment
    let notes = Array.from(notesStore.values()).filter(
      (n) => n.assignmentId === assignmentId && !n.deletedAt
    );

    // Debtor can only see visible notes
    if (isDebtor) {
      notes = notes.filter((n) => n.visibleToDebtor);
    }

    // Apply filters
    if (filters.category) {
      notes = notes.filter((n) => n.category === filters.category);
    }

    if (filters.pinned !== undefined) {
      notes = notes.filter((n) => n.pinned === filters.pinned);
    }

    if (filters.visibleToDebtor !== undefined && isDefender) {
      notes = notes.filter((n) => n.visibleToDebtor === filters.visibleToDebtor);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      notes = notes.filter((n) => n.title.toLowerCase().includes(searchLower));
    }

    if (filters.dateRange) {
      notes = notes.filter(
        (n) =>
          n.createdAt >= filters.dateRange!.start &&
          n.createdAt <= filters.dateRange!.end
      );
    }

    // Sort
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    notes.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case 'createdAt':
        default:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Paginate
    const total = notes.length;
    const paginatedNotes = notes.slice(
      pagination.offset,
      pagination.offset + pagination.limit
    );

    // Decrypt and format
    const formattedNotes = await Promise.all(
      paginatedNotes.map(async (note) => {
        const encrypted = JSON.parse(note.content);
        const decrypted = await messageEncryption.decryptMessage(encrypted);
        return this.formatNoteResponse(note, decrypted, {
          id: note.defenderId,
          name: 'Public Defender',
        });
      })
    );

    return {
      data: formattedNotes,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  /**
   * Get a single note by ID
   */
  async getNote(
    noteId: string,
    user: { id: string; role: string }
  ): Promise<NoteResponse> {
    const note = notesStore.get(noteId);

    if (!note || note.deletedAt) {
      throw new Error('Note not found');
    }

    const assignment = mockAssignments.get(note.assignmentId);

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    // Check access
    const isDefender = user.id === assignment.defenderId;
    const isDebtor = user.id === assignment.debtorId;

    if (!isDefender && !isDebtor) {
      throw new Error('Not authorized to view this note');
    }

    if (isDebtor && !note.visibleToDebtor) {
      throw new Error('This note is not shared with you');
    }

    if (user.role === 'CREDITOR') {
      throw new Error('Creditors cannot access defender notes');
    }

    // Decrypt content
    const encrypted = JSON.parse(note.content);
    const decrypted = await messageEncryption.decryptMessage(encrypted);

    return this.formatNoteResponse(note, decrypted, {
      id: note.defenderId,
      name: 'Public Defender',
    });
  }

  /**
   * Soft delete a note
   */
  async deleteNote(
    noteId: string,
    defender: { id: string }
  ): Promise<{ id: string; deleted: boolean }> {
    const note = notesStore.get(noteId);

    if (!note) {
      throw new Error('Note not found');
    }

    if (note.defenderId !== defender.id) {
      throw new Error('Cannot delete another defender\'s note');
    }

    if (note.deletedAt) {
      throw new Error('Note already deleted');
    }

    // Soft delete
    note.deletedAt = new Date();
    notesStore.set(noteId, note);

    console.log(`[Audit] NOTE_DELETED by ${defender.id}: ${noteId}`);

    return { id: noteId, deleted: true };
  }

  /**
   * Restore a deleted note
   */
  async restoreNote(
    noteId: string,
    defender: { id: string }
  ): Promise<NoteResponse> {
    const note = notesStore.get(noteId);

    if (!note) {
      throw new Error('Note not found');
    }

    if (note.defenderId !== defender.id) {
      throw new Error('Cannot restore another defender\'s note');
    }

    if (!note.deletedAt) {
      throw new Error('Note is not deleted');
    }

    // Restore
    note.deletedAt = undefined;
    note.updatedAt = new Date();
    notesStore.set(noteId, note);

    console.log(`[Audit] NOTE_RESTORED by ${defender.id}: ${noteId}`);

    // Decrypt content
    const encrypted = JSON.parse(note.content);
    const decrypted = await messageEncryption.decryptMessage(encrypted);

    return this.formatNoteResponse(note, decrypted, {
      id: defender.id,
      name: 'Public Defender',
    });
  }

  /**
   * Get note edit history
   */
  async getNoteHistory(
    noteId: string,
    defender: { id: string }
  ): Promise<NoteHistory[]> {
    const note = notesStore.get(noteId);

    if (!note) {
      throw new Error('Note not found');
    }

    if (note.defenderId !== defender.id) {
      throw new Error('Cannot view history of another defender\'s note');
    }

    const history = Array.from(historyStore.values())
      .filter((h) => h.noteId === noteId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return history;
  }

  /**
   * Restore note to a previous version
   */
  async restoreToVersion(
    noteId: string,
    historyId: string,
    defender: { id: string; name: string }
  ): Promise<NoteResponse> {
    const note = notesStore.get(noteId);
    const historyEntry = historyStore.get(historyId);

    if (!note) {
      throw new Error('Note not found');
    }

    if (!historyEntry || historyEntry.noteId !== noteId) {
      throw new Error('History entry not found');
    }

    if (note.defenderId !== defender.id) {
      throw new Error('Cannot restore another defender\'s note');
    }

    // Save current state to history
    const newHistoryId = uuidv4();
    const newHistory: NoteHistory = {
      id: newHistoryId,
      noteId: note.id,
      previousTitle: note.title,
      previousContent: note.content,
      previousCategory: note.category,
      editedBy: defender.id,
      editReason: `Restored to version from ${historyEntry.createdAt.toISOString()}`,
      createdAt: new Date(),
    };
    historyStore.set(newHistoryId, newHistory);

    // Restore previous version
    if (historyEntry.previousTitle) {
      note.title = historyEntry.previousTitle;
    }
    note.content = historyEntry.previousContent;
    if (historyEntry.previousCategory) {
      note.category = historyEntry.previousCategory;
    }
    note.updatedAt = new Date();

    notesStore.set(noteId, note);

    // Decrypt content
    const encrypted = JSON.parse(note.content);
    const decrypted = await messageEncryption.decryptMessage(encrypted);

    return this.formatNoteResponse(note, decrypted, defender);
  }

  /**
   * Format note response
   */
  private formatNoteResponse(
    note: DefenderNote,
    decryptedContent: string,
    defender: { id: string; name: string }
  ): NoteResponse {
    // Check if note has edits
    const hasEdits = Array.from(historyStore.values()).some(
      (h) => h.noteId === note.id
    );

    return {
      id: note.id,
      assignmentId: note.assignmentId,
      category: note.category,
      title: note.title,
      content: decryptedContent,
      contentPreview:
        decryptedContent.length > 200
          ? decryptedContent.substring(0, 200) + '...'
          : decryptedContent,
      visibleToDebtor: note.visibleToDebtor,
      pinned: note.pinned,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      hasEdits,
      defender: {
        id: defender.id,
        name: defender.name,
      },
    };
  }

  /**
   * Get all notes for a defender (across all assignments)
   */
  async getDefenderNotes(
    defenderId: string,
    filters: NoteFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResult<NoteResponse>> {
    let notes = Array.from(notesStore.values()).filter(
      (n) => n.defenderId === defenderId && !n.deletedAt
    );

    // Apply filters
    if (filters.category) {
      notes = notes.filter((n) => n.category === filters.category);
    }

    if (filters.pinned !== undefined) {
      notes = notes.filter((n) => n.pinned === filters.pinned);
    }

    // Sort by most recent
    notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const total = notes.length;
    const paginatedNotes = notes.slice(
      pagination.offset,
      pagination.offset + pagination.limit
    );

    const formattedNotes = await Promise.all(
      paginatedNotes.map(async (note) => {
        const encrypted = JSON.parse(note.content);
        const decrypted = await messageEncryption.decryptMessage(encrypted);
        return this.formatNoteResponse(note, decrypted, {
          id: defenderId,
          name: 'You',
        });
      })
    );

    return {
      data: formattedNotes,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }
}

// Export singleton instance
export const defenderNoteService = new DefenderNoteService();
