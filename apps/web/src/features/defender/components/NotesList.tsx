/**
 * Notes List Component
 * Displays and manages the list of case notes for defenders
 */

import React, { useState, useMemo } from 'react';

// Types
type NoteCategory =
  | 'INITIAL_ASSESSMENT'
  | 'FINANCIAL_GUIDANCE'
  | 'COMMUNICATION_COACHING'
  | 'PLAN_RECOMMENDATIONS'
  | 'FOLLOW_UP_REQUIRED'
  | 'CASE_RESOLUTION'
  | 'GENERAL';

interface Note {
  id: string;
  category: NoteCategory;
  title: string;
  contentPreview: string;
  visibleToDebtor: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  hasEdits: boolean;
}

interface NotesListProps {
  assignmentId: string;
  debtorName: string;
  onNewNote: () => void;
  onSelectNote: (noteId: string) => void;
}

// Category metadata
const CATEGORY_META: Record<NoteCategory, { icon: string; color: string; label: string }> = {
  INITIAL_ASSESSMENT: { icon: '📋', color: '#3498db', label: 'Initial Assessment' },
  FINANCIAL_GUIDANCE: { icon: '💰', color: '#27ae60', label: 'Financial Guidance' },
  COMMUNICATION_COACHING: { icon: '💬', color: '#9b59b6', label: 'Communication Coaching' },
  PLAN_RECOMMENDATIONS: { icon: '📝', color: '#e67e22', label: 'Plan Recommendations' },
  FOLLOW_UP_REQUIRED: { icon: '⏰', color: '#e74c3c', label: 'Follow-up Required' },
  CASE_RESOLUTION: { icon: '✅', color: '#1abc9c', label: 'Case Resolution' },
  GENERAL: { icon: '📌', color: '#95a5a6', label: 'General' },
};

// Mock data
const mockNotes: Note[] = [
  {
    id: '1',
    category: 'INITIAL_ASSESSMENT',
    title: 'Initial Assessment - John Doe',
    contentPreview: 'First meeting with debtor. Reviewed debt details and discussed initial concerns about the $5,000 balance...',
    visibleToDebtor: true,
    pinned: true,
    createdAt: '2025-01-15T10:30:00Z',
    updatedAt: '2025-01-15T10:30:00Z',
    hasEdits: false,
  },
  {
    id: '2',
    category: 'FINANCIAL_GUIDANCE',
    title: 'Financial Review - January 2025',
    contentPreview: 'Reviewed monthly budget and determined debtor can afford $200-300/month for debt payment...',
    visibleToDebtor: false,
    pinned: false,
    createdAt: '2025-01-18T14:00:00Z',
    updatedAt: '2025-01-19T09:15:00Z',
    hasEdits: true,
  },
  {
    id: '3',
    category: 'PLAN_RECOMMENDATIONS',
    title: 'Payment Plan Discussion',
    contentPreview: 'Discussed three payment plan options with debtor. Option B ($250/month for 24 months) appears most suitable...',
    visibleToDebtor: false,
    pinned: false,
    createdAt: '2025-01-20T11:00:00Z',
    updatedAt: '2025-01-22T16:30:00Z',
    hasEdits: true,
  },
  {
    id: '4',
    category: 'FOLLOW_UP_REQUIRED',
    title: 'Creditor Response Pending',
    contentPreview: 'Need to check on creditor response to our settlement proposal. Follow up by Jan 30...',
    visibleToDebtor: false,
    pinned: false,
    createdAt: '2025-01-22T09:00:00Z',
    updatedAt: '2025-01-22T09:00:00Z',
    hasEdits: false,
  },
];

export const NotesList: React.FC<NotesListProps> = ({
  assignmentId,
  debtorName,
  onNewNote,
  onSelectNote,
}) => {
  const [notes] = useState<Note[]>(mockNotes);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<NoteCategory | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'title'>('recent');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (note) =>
          note.title.toLowerCase().includes(term) ||
          note.contentPreview.toLowerCase().includes(term)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'ALL') {
      result = result.filter((note) => note.category === categoryFilter);
    }

    // Apply pinned filter
    if (showPinnedOnly) {
      result = result.filter((note) => note.pinned);
    }

    // Sort - pinned notes always first
    result.sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }

      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [notes, searchTerm, categoryFilter, sortBy, showPinnedOnly]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Case Notes - {debtorName}</h2>
        <button style={styles.newButton} onClick={onNewNote}>
          + New Note
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Search notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as NoteCategory | 'ALL')}
          style={styles.select}
        >
          <option value="ALL">All Categories</option>
          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.icon} {meta.label}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'recent' | 'oldest' | 'title')}
          style={styles.select}
        >
          <option value="recent">Most Recent</option>
          <option value="oldest">Oldest First</option>
          <option value="title">Title A-Z</option>
        </select>

        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={showPinnedOnly}
            onChange={(e) => setShowPinnedOnly(e.target.checked)}
          />
          Pinned only
        </label>
      </div>

      {/* Notes count */}
      <div style={styles.count}>
        {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
        {searchTerm || categoryFilter !== 'ALL' || showPinnedOnly ? ' (filtered)' : ''}
      </div>

      {/* Notes list */}
      <div style={styles.notesList}>
        {filteredNotes.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📝</div>
            <div style={styles.emptyText}>
              {searchTerm || categoryFilter !== 'ALL' || showPinnedOnly
                ? 'No notes match your filters'
                : 'No notes yet'}
            </div>
            {!searchTerm && categoryFilter === 'ALL' && !showPinnedOnly && (
              <button style={styles.newButton} onClick={onNewNote}>
                Create your first note
              </button>
            )}
          </div>
        ) : (
          filteredNotes.map((note) => (
            <div
              key={note.id}
              style={styles.noteCard}
              onClick={() => onSelectNote(note.id)}
            >
              <div style={styles.noteHeader}>
                <div style={styles.noteTitle}>
                  {note.pinned && <span style={styles.pinIcon}>📌</span>}
                  {note.title}
                </div>
                <div
                  style={{
                    ...styles.categoryBadge,
                    backgroundColor: CATEGORY_META[note.category].color,
                  }}
                >
                  {CATEGORY_META[note.category].icon} {CATEGORY_META[note.category].label}
                </div>
              </div>

              <div style={styles.notePreview}>{note.contentPreview}</div>

              <div style={styles.noteMeta}>
                <span style={styles.noteDate}>{formatDate(note.createdAt)}</span>
                <span style={styles.noteIndicators}>
                  {note.visibleToDebtor ? (
                    <span style={styles.sharedBadge} title="Shared with debtor">
                      👁 Shared
                    </span>
                  ) : (
                    <span style={styles.privateBadge} title="Private">
                      🔒 Private
                    </span>
                  )}
                  {note.hasEdits && (
                    <span style={styles.editedBadge} title="Has been edited">
                      Edited
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#f8f9fa',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a365d',
  },
  newButton: {
    padding: '10px 20px',
    backgroundColor: '#1a365d',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '14px',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    padding: '16px 20px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '10px 14px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    padding: '10px 14px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#666',
    cursor: 'pointer',
  },
  count: {
    padding: '10px 20px',
    fontSize: '13px',
    color: '#888',
  },
  notesList: {
    flex: 1,
    overflow: 'auto',
    padding: '0 20px 20px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '20px',
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s, transform 0.2s',
  },
  noteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
    gap: '12px',
  },
  noteTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  pinIcon: {
    fontSize: '14px',
  },
  categoryBadge: {
    fontSize: '11px',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '12px',
    whiteSpace: 'nowrap',
    fontWeight: 500,
  },
  notePreview: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
    marginBottom: '12px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  noteMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: '#888',
  },
  noteDate: {},
  noteIndicators: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  sharedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '10px',
    fontSize: '11px',
  },
  privateBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    backgroundColor: '#f8f9fa',
    color: '#666',
    borderRadius: '10px',
    fontSize: '11px',
  },
  editedBadge: {
    padding: '2px 8px',
    backgroundColor: '#fff3cd',
    color: '#856404',
    borderRadius: '10px',
    fontSize: '11px',
  },
};

export default NotesList;
