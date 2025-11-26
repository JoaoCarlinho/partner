/**
 * Debtor Defender Notes Component
 * Read-only view of notes shared by the public defender
 */

import React, { useState } from 'react';

// Types
type NoteCategory =
  | 'INITIAL_ASSESSMENT'
  | 'FINANCIAL_GUIDANCE'
  | 'COMMUNICATION_COACHING'
  | 'PLAN_RECOMMENDATIONS'
  | 'FOLLOW_UP_REQUIRED'
  | 'CASE_RESOLUTION'
  | 'GENERAL';

interface SharedNote {
  id: string;
  category: NoteCategory;
  title: string;
  content: string;
  sharedAt: string;
  defender: {
    name: string;
    organizationName: string;
  };
}

interface DefenderNotesProps {
  assignmentId: string;
  defenderName: string;
  defenderOrganization: string;
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

// Mock data for shared notes
const mockSharedNotes: SharedNote[] = [
  {
    id: '1',
    category: 'INITIAL_ASSESSMENT',
    title: 'Initial Assessment - Your Case',
    content: `## Initial Case Assessment

**Date:** January 15, 2025

### Case Overview
I've reviewed your debt details and want to share some initial findings with you.

- **Debt Amount:** $5,000
- **Creditor:** ABC Collections
- **Status:** Under review

### Your Options
Based on our initial assessment, you have several options available:

1. **Negotiate a settlement** - We may be able to negotiate a reduced amount
2. **Set up a payment plan** - Spread payments over time to make them manageable
3. **Request debt validation** - Ensure the debt is valid and accurate

### Next Steps
I'll be in touch to discuss these options in more detail. In the meantime, please:
- Gather any documentation you have about this debt
- Make note of any concerns or questions you have
- Don't make any payments until we've talked

Feel free to message me with any questions!`,
    sharedAt: '2025-01-15T10:30:00Z',
    defender: {
      name: 'Jane Smith',
      organizationName: 'Legal Aid Society',
    },
  },
  {
    id: '2',
    category: 'PLAN_RECOMMENDATIONS',
    title: 'Payment Plan Options',
    content: `## Payment Plan Recommendations

**Date:** January 20, 2025

After reviewing your financial situation, I'm sharing some payment plan options for your consideration:

### Option A: Standard Plan
- Monthly payment: $250
- Duration: 20 months
- Total payment: $5,000

### Option B: Extended Plan
- Monthly payment: $150
- Duration: 36 months
- Total payment: $5,400 (includes interest)

### Option C: Settlement
- One-time payment: $3,500
- Savings: $1,500 (30% reduction)
- Note: Requires immediate payment

### My Recommendation
Based on your income and expenses, **Option A** appears to be the most balanced approach. It keeps payments manageable while avoiding additional interest.

However, if you can save up for the settlement amount, **Option C** would save you the most money overall.

### Questions to Consider
- Can you afford $250/month comfortably?
- Do you have savings that could be used for a settlement?
- Are there any upcoming expenses that might affect your ability to pay?

Let's discuss these options in our next conversation!`,
    sharedAt: '2025-01-20T14:00:00Z',
    defender: {
      name: 'Jane Smith',
      organizationName: 'Legal Aid Society',
    },
  },
];

export const DefenderNotes: React.FC<DefenderNotesProps> = ({
  assignmentId,
  defenderName,
  defenderOrganization,
}) => {
  const [notes] = useState<SharedNote[]>(mockSharedNotes);
  const [selectedNote, setSelectedNote] = useState<SharedNote | null>(null);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Render markdown-ish content (simplified)
  const renderContent = (content: string) => {
    // Split by lines and process
    return content.split('\n').map((line, index) => {
      // Headers
      if (line.startsWith('## ')) {
        return (
          <h2 key={index} style={styles.h2}>
            {line.replace('## ', '')}
          </h2>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={index} style={styles.h3}>
            {line.replace('### ', '')}
          </h3>
        );
      }
      // Bold
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={index} style={styles.paragraph}>
            {parts.map((part, i) =>
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        );
      }
      // List items
      if (line.startsWith('- ')) {
        return (
          <li key={index} style={styles.listItem}>
            {line.replace('- ', '')}
          </li>
        );
      }
      if (/^\d+\. /.test(line)) {
        return (
          <li key={index} style={styles.listItem}>
            {line.replace(/^\d+\. /, '')}
          </li>
        );
      }
      // Empty lines
      if (!line.trim()) {
        return <br key={index} />;
      }
      // Regular text
      return (
        <p key={index} style={styles.paragraph}>
          {line}
        </p>
      );
    });
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerIcon}>🛡️</div>
        <div style={styles.headerContent}>
          <h2 style={styles.title}>Notes from Your Public Defender</h2>
          <p style={styles.subtitle}>
            Your public defender, <strong>{defenderName}</strong> from{' '}
            <strong>{defenderOrganization}</strong>, has shared the following
            notes with you about your case.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div style={styles.infoBanner}>
        <span style={styles.infoIcon}>ℹ️</span>
        <span>
          These notes are provided by your defender to help you understand your
          case. If you have questions about any of these notes, please message
          your defender directly.
        </span>
      </div>

      {/* Notes List or Detail */}
      {selectedNote ? (
        <div style={styles.noteDetail}>
          <button
            style={styles.backButton}
            onClick={() => setSelectedNote(null)}
          >
            ← Back to all notes
          </button>

          <div style={styles.noteCard}>
            <div style={styles.noteHeader}>
              <div
                style={{
                  ...styles.categoryBadge,
                  backgroundColor: CATEGORY_META[selectedNote.category].color,
                }}
              >
                {CATEGORY_META[selectedNote.category].icon}{' '}
                {CATEGORY_META[selectedNote.category].label}
              </div>
              <div style={styles.noteDate}>
                Shared: {formatDate(selectedNote.sharedAt)}
              </div>
            </div>

            <h1 style={styles.noteTitle}>{selectedNote.title}</h1>

            <div style={styles.defenderInfo}>
              <span style={styles.defenderIcon}>🛡️</span>
              <span>
                From: {selectedNote.defender.name},{' '}
                {selectedNote.defender.organizationName}
              </span>
            </div>

            <div style={styles.noteContent}>
              {renderContent(selectedNote.content)}
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.notesList}>
          {notes.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📝</div>
              <div style={styles.emptyText}>No notes shared yet</div>
              <p style={styles.emptySubtext}>
                When your public defender shares notes with you, they will
                appear here.
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                style={styles.noteListItem}
                onClick={() => setSelectedNote(note)}
              >
                <div style={styles.noteListHeader}>
                  <div
                    style={{
                      ...styles.categoryBadge,
                      backgroundColor: CATEGORY_META[note.category].color,
                    }}
                  >
                    {CATEGORY_META[note.category].icon}{' '}
                    {CATEGORY_META[note.category].label}
                  </div>
                </div>

                <h3 style={styles.noteListTitle}>{note.title}</h3>

                <div style={styles.noteListMeta}>
                  <span style={styles.defenderBadge}>
                    <span style={styles.smallShield}>🛡️</span>
                    {note.defender.name}
                  </span>
                  <span style={styles.noteListDate}>
                    Shared: {formatDate(note.sharedAt)}
                  </span>
                </div>

                <div style={styles.notePreview}>
                  {note.content.substring(0, 200)}...
                </div>

                <button style={styles.readButton}>Read Full Note →</button>
              </div>
            ))
          )}
        </div>
      )}
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
    gap: '16px',
    padding: '20px',
    backgroundColor: '#1a365d',
    color: '#fff',
  },
  headerIcon: {
    fontSize: '40px',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    margin: '0 0 8px',
    fontSize: '22px',
    fontWeight: 600,
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    opacity: 0.9,
    lineHeight: '1.5',
  },
  infoBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 20px',
    backgroundColor: '#e8f4f8',
    borderBottom: '1px solid #d0e8f0',
    fontSize: '13px',
    color: '#0c5460',
  },
  infoIcon: {
    fontSize: '16px',
  },
  notesList: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
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
    fontSize: '18px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#666',
    maxWidth: '300px',
  },
  noteListItem: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    border: '2px solid #e0e0e0',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  noteListHeader: {
    marginBottom: '12px',
  },
  categoryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#fff',
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: 500,
  },
  noteListTitle: {
    margin: '0 0 12px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a365d',
  },
  noteListMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    fontSize: '13px',
    color: '#666',
  },
  defenderBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: '#f0f0f0',
    borderRadius: '6px',
  },
  smallShield: {
    fontSize: '12px',
  },
  noteListDate: {},
  notePreview: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
    marginBottom: '16px',
  },
  readButton: {
    padding: '10px 20px',
    backgroundColor: '#1a365d',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '14px',
  },
  noteDetail: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
  },
  backButton: {
    marginBottom: '16px',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#1a365d',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '2px solid #1a365d',
  },
  noteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  noteDate: {
    fontSize: '13px',
    color: '#666',
  },
  noteTitle: {
    margin: '0 0 16px',
    fontSize: '24px',
    fontWeight: 600,
    color: '#1a365d',
  },
  defenderInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#333',
  },
  defenderIcon: {
    fontSize: '20px',
  },
  noteContent: {
    fontSize: '15px',
    lineHeight: '1.7',
    color: '#333',
  },
  h2: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a365d',
    marginTop: '24px',
    marginBottom: '12px',
  },
  h3: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    marginTop: '20px',
    marginBottom: '10px',
  },
  paragraph: {
    margin: '8px 0',
  },
  listItem: {
    marginLeft: '20px',
    marginBottom: '6px',
  },
};

export default DefenderNotes;
