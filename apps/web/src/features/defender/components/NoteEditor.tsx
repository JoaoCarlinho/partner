/**
 * Note Editor Component
 * Rich text editor for creating and editing case notes
 */

import React, { useState, useEffect, useCallback } from 'react';

// Types
type NoteCategory =
  | 'INITIAL_ASSESSMENT'
  | 'FINANCIAL_GUIDANCE'
  | 'COMMUNICATION_COACHING'
  | 'PLAN_RECOMMENDATIONS'
  | 'FOLLOW_UP_REQUIRED'
  | 'CASE_RESOLUTION'
  | 'GENERAL';

interface NoteTemplate {
  id: string;
  name: string;
  category: NoteCategory;
  content: string;
  isSystem: boolean;
}

interface NoteEditorProps {
  noteId?: string;
  assignmentId: string;
  initialData?: {
    category: NoteCategory;
    title: string;
    content: string;
    visibleToDebtor: boolean;
    pinned: boolean;
  };
  onSave: (data: {
    category: NoteCategory;
    title: string;
    content: string;
    visibleToDebtor: boolean;
    pinned: boolean;
  }) => void;
  onCancel: () => void;
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

// Mock templates
const mockTemplates: NoteTemplate[] = [
  {
    id: '1',
    name: 'Initial Assessment',
    category: 'INITIAL_ASSESSMENT',
    isSystem: true,
    content: `## Initial Case Assessment

**Date:** ${new Date().toLocaleDateString()}

### Case Overview
- Debt Amount: $
- Creditor:
- Debt Age:

### Initial Observations
-

### Next Steps
- [ ]
`,
  },
  {
    id: '2',
    name: 'Financial Review',
    category: 'FINANCIAL_GUIDANCE',
    isSystem: true,
    content: `## Financial Review Notes

**Date:** ${new Date().toLocaleDateString()}

### Income Assessment
- Monthly Income: $
- Income Stability:

### Expense Analysis
- Essential Expenses: $
- Available for Debt: $

### Recommendations
-
`,
  },
  {
    id: '3',
    name: 'Follow-up Checklist',
    category: 'FOLLOW_UP_REQUIRED',
    isSystem: true,
    content: `## Follow-up Required

**Follow-up By:**

### Pending Items
- [ ]
- [ ]

### Notes
-
`,
  },
];

export const NoteEditor: React.FC<NoteEditorProps> = ({
  noteId,
  assignmentId,
  initialData,
  onSave,
  onCancel,
}) => {
  const [category, setCategory] = useState<NoteCategory>(
    initialData?.category || 'GENERAL'
  );
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [visibleToDebtor, setVisibleToDebtor] = useState(
    initialData?.visibleToDebtor || false
  );
  const [pinned, setPinned] = useState(initialData?.pinned || false);
  const [showVisibilityWarning, setShowVisibilityWarning] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const isEditing = !!noteId;

  // Auto-save draft
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      // In production, save to localStorage or API
      setLastSaved(new Date());
      console.log('Draft auto-saved');
    }, 3000);

    return () => clearTimeout(timer);
  }, [title, content, category, isDirty]);

  // Mark as dirty when content changes
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
  }, []);

  // Handle visibility toggle
  const handleVisibilityChange = (checked: boolean) => {
    if (checked && !visibleToDebtor) {
      setShowVisibilityWarning(true);
    } else {
      setVisibleToDebtor(checked);
    }
  };

  // Confirm visibility change
  const confirmVisibility = () => {
    setVisibleToDebtor(true);
    setShowVisibilityWarning(false);
  };

  // Apply template
  const applyTemplate = (template: NoteTemplate) => {
    setContent(template.content);
    setCategory(template.category);
    if (!title) {
      setTitle(template.name);
    }
    setShowTemplates(false);
    setIsDirty(true);
  };

  // Handle save
  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    onSave({
      category,
      title: title.trim(),
      content,
      visibleToDebtor,
      pinned,
    });
  };

  // Format toolbar button
  const insertFormat = (format: string) => {
    const textarea = document.getElementById('note-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let insertion = '';
    switch (format) {
      case 'bold':
        insertion = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        insertion = `*${selectedText || 'italic text'}*`;
        break;
      case 'h1':
        insertion = `\n# ${selectedText || 'Heading'}\n`;
        break;
      case 'h2':
        insertion = `\n## ${selectedText || 'Heading'}\n`;
        break;
      case 'bullet':
        insertion = `\n- ${selectedText || 'List item'}`;
        break;
      case 'number':
        insertion = `\n1. ${selectedText || 'List item'}`;
        break;
      case 'checkbox':
        insertion = `\n- [ ] ${selectedText || 'Task item'}`;
        break;
      case 'link':
        insertion = `[${selectedText || 'link text'}](url)`;
        break;
      default:
        return;
    }

    const newContent = text.substring(0, start) + insertion + text.substring(end);
    handleContentChange(newContent);

    // Set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + insertion.length;
      textarea.selectionEnd = start + insertion.length;
    }, 0);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>{isEditing ? 'Edit Note' : 'New Note'}</h2>
        <div style={styles.headerActions}>
          <button style={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button style={styles.saveButton} onClick={handleSave}>
            {isEditing ? 'Save Changes' : 'Create Note'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div style={styles.editorContainer}>
        {/* Category and Template Row */}
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as NoteCategory)}
              style={styles.select}
            >
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.icon} {meta.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Template</label>
            <div style={styles.templateDropdown}>
              <button
                style={styles.templateButton}
                onClick={() => setShowTemplates(!showTemplates)}
              >
                📋 Use Template
              </button>
              {showTemplates && (
                <div style={styles.templateMenu}>
                  {mockTemplates.map((template) => (
                    <div
                      key={template.id}
                      style={styles.templateItem}
                      onClick={() => applyTemplate(template)}
                    >
                      <span>{CATEGORY_META[template.category].icon}</span>
                      <span>{template.name}</span>
                      {template.isSystem && (
                        <span style={styles.systemBadge}>System</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={styles.field}>
          <label style={styles.label}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Enter note title..."
            style={styles.titleInput}
          />
        </div>

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <button style={styles.toolbarButton} onClick={() => insertFormat('bold')} title="Bold">
            <strong>B</strong>
          </button>
          <button style={styles.toolbarButton} onClick={() => insertFormat('italic')} title="Italic">
            <em>I</em>
          </button>
          <span style={styles.toolbarDivider}>|</span>
          <button style={styles.toolbarButton} onClick={() => insertFormat('h1')} title="Heading 1">
            H1
          </button>
          <button style={styles.toolbarButton} onClick={() => insertFormat('h2')} title="Heading 2">
            H2
          </button>
          <span style={styles.toolbarDivider}>|</span>
          <button style={styles.toolbarButton} onClick={() => insertFormat('bullet')} title="Bullet List">
            •
          </button>
          <button style={styles.toolbarButton} onClick={() => insertFormat('number')} title="Numbered List">
            1.
          </button>
          <button style={styles.toolbarButton} onClick={() => insertFormat('checkbox')} title="Checkbox">
            ☐
          </button>
          <span style={styles.toolbarDivider}>|</span>
          <button style={styles.toolbarButton} onClick={() => insertFormat('link')} title="Link">
            🔗
          </button>
        </div>

        {/* Content */}
        <div style={styles.field}>
          <textarea
            id="note-content"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Write your note here... (Markdown supported)"
            style={styles.contentArea}
          />
        </div>

        {/* Options */}
        <div style={styles.options}>
          <div style={styles.visibilityOption}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={visibleToDebtor}
                onChange={(e) => handleVisibilityChange(e.target.checked)}
              />
              Share with debtor
            </label>
            {visibleToDebtor && (
              <span style={styles.visibilityNote}>
                👁 The debtor will be able to read this note
              </span>
            )}
          </div>

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            Pin this note
          </label>
        </div>

        {/* Auto-save indicator */}
        <div style={styles.autoSave}>
          {lastSaved ? (
            <span>Draft saved {lastSaved.toLocaleTimeString()}</span>
          ) : isDirty ? (
            <span>Saving draft...</span>
          ) : null}
        </div>
      </div>

      {/* Visibility Warning Modal */}
      {showVisibilityWarning && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>⚠️ Share Note with Debtor?</h3>
            <p style={styles.modalText}>
              Are you sure you want to share this note with the debtor? They will be
              able to read the full content of this note.
            </p>
            <p style={styles.modalText}>
              <strong>This action can be undone</strong> by toggling visibility off later.
            </p>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setShowVisibilityWarning(false)}
              >
                Cancel
              </button>
              <button style={styles.confirmButton} onClick={confirmVisibility}>
                Yes, Share Note
              </button>
            </div>
          </div>
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
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    color: '#666',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '14px',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#1a365d',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '14px',
  },
  editorContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
  },
  row: {
    display: 'flex',
    gap: '20px',
    marginBottom: '16px',
  },
  field: {
    flex: 1,
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#333',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
  },
  templateDropdown: {
    position: 'relative',
  },
  templateButton: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
  },
  templateMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 100,
    marginTop: '4px',
  },
  templateItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid #f0f0f0',
  },
  systemBadge: {
    marginLeft: 'auto',
    fontSize: '11px',
    color: '#888',
    backgroundColor: '#f0f0f0',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  titleInput: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 500,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #e0e0e0',
    borderBottom: 'none',
    borderRadius: '6px 6px 0 0',
    marginBottom: 0,
  },
  toolbarButton: {
    padding: '6px 10px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#333',
  },
  toolbarDivider: {
    color: '#ddd',
    margin: '0 4px',
  },
  contentArea: {
    width: '100%',
    minHeight: '300px',
    padding: '14px',
    border: '1px solid #e0e0e0',
    borderRadius: '0 0 6px 6px',
    fontSize: '14px',
    fontFamily: 'monospace',
    lineHeight: '1.6',
    resize: 'vertical',
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    marginTop: '16px',
  },
  visibilityOption: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  visibilityNote: {
    fontSize: '12px',
    color: '#e67e22',
    marginLeft: '24px',
  },
  autoSave: {
    marginTop: '12px',
    fontSize: '12px',
    color: '#888',
    textAlign: 'right',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    maxWidth: '400px',
    width: '90%',
  },
  modalTitle: {
    margin: '0 0 16px',
    fontSize: '18px',
    color: '#333',
  },
  modalText: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
  },
  confirmButton: {
    padding: '10px 20px',
    backgroundColor: '#e67e22',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
  },
};

export default NoteEditor;
