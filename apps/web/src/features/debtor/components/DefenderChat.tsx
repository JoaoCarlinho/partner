/**
 * Debtor's Defender Chat Component
 * Private messaging interface for debtors communicating with their assigned public defender
 */

import React, { useState, useEffect, useRef } from 'react';

// Types
interface Message {
  id: string;
  assignmentId: string;
  senderId: string;
  senderType: 'DEFENDER' | 'DEBTOR';
  senderName: string;
  content: string;
  contentType: 'TEXT' | 'FILE' | 'SYSTEM';
  attachments: Attachment[];
  readAt?: string;
  createdAt: string;
}

interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface DefenderInfo {
  id: string;
  name: string;
  organization: string;
  specialty: string;
  email: string;
  phone?: string;
}

interface DebtorDefenderChatProps {
  assignmentId: string;
  debtorId: string;
  debtorName: string;
  defender: DefenderInfo;
}

// Mock data for development
const mockMessages: Message[] = [
  {
    id: '1',
    assignmentId: 'assign-001',
    senderId: 'defender-001',
    senderType: 'DEFENDER',
    senderName: 'Jane Smith',
    content: "Hello! I'm Jane Smith from Legal Aid Society. I've been assigned as your public defender to help you navigate this debt situation.",
    contentType: 'TEXT',
    attachments: [],
    readAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '2',
    assignmentId: 'assign-001',
    senderId: 'defender-001',
    senderType: 'DEFENDER',
    senderName: 'Jane Smith',
    content: "I've reviewed your case and I'd like to discuss some important points with you. Do you have any immediate questions or concerns?",
    contentType: 'TEXT',
    attachments: [],
    readAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 7100000).toISOString(),
  },
  {
    id: '3',
    assignmentId: 'assign-001',
    senderId: 'debtor-001',
    senderType: 'DEBTOR',
    senderName: 'John Doe',
    content: "Thank you so much for reaching out. I've been really stressed about this debt. Is there anything I can do to reduce the amount owed?",
    contentType: 'TEXT',
    attachments: [],
    createdAt: new Date(Date.now() - 6000000).toISOString(),
  },
  {
    id: '4',
    assignmentId: 'assign-001',
    senderId: 'defender-001',
    senderType: 'DEFENDER',
    senderName: 'Jane Smith',
    content: "Absolutely, there are several options we can explore. I've attached a document that outlines your rights under the FDCPA and potential negotiation strategies.",
    contentType: 'FILE',
    attachments: [
      {
        id: 'att-001',
        fileName: 'Your_Rights_and_Options.pdf',
        fileType: 'application/pdf',
        fileSize: 156000,
      },
    ],
    readAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 5400000).toISOString(),
  },
];

export const DebtorDefenderChat: React.FC<DebtorDefenderChatProps> = ({
  assignmentId,
  debtorId,
  debtorName,
  defender,
}) => {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [defenderTyping, setDefenderTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    const tempId = `temp-${Date.now()}`;
    const newMsg: Message = {
      id: tempId,
      assignmentId,
      senderId: debtorId,
      senderType: 'DEBTOR',
      senderName: debtorName,
      content: newMessage,
      contentType: selectedFile ? 'FILE' : 'TEXT',
      attachments: selectedFile
        ? [
            {
              id: `att-${Date.now()}`,
              fileName: selectedFile.name,
              fileType: selectedFile.type,
              fileSize: selectedFile.size,
            },
          ]
        : [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setNewMessage('');
    setSelectedFile(null);

    // In production, call API
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File too large. Maximum size is 10MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  // Handle file download
  const handleDownload = async (attachment: Attachment) => {
    console.log('Downloading:', attachment.fileName);
  };

  // Format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file type icon
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('image')) return '🖼️';
    return '📎';
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div style={styles.container}>
      {/* Header with Defender Info */}
      <div style={styles.header}>
        <div style={styles.defenderInfo}>
          <div style={styles.defenderAvatar}>
            {defender.name.charAt(0)}
          </div>
          <div style={styles.defenderDetails}>
            <div style={styles.defenderName}>
              <span style={styles.shieldIcon}>🛡️</span>
              {defender.name}
            </div>
            <div style={styles.defenderOrg}>{defender.organization}</div>
            <div style={styles.defenderSpecialty}>{defender.specialty}</div>
          </div>
        </div>
        <button
          style={styles.infoButton}
          onClick={() => alert(`Contact: ${defender.email}`)}
        >
          ℹ️
        </button>
      </div>

      {/* Privacy Notice */}
      <div style={styles.privacyNotice}>
        <div style={styles.privacyIcon}>🔒</div>
        <div style={styles.privacyText}>
          <strong>Private Conversation</strong>
          <div style={styles.privacySubtext}>
            Messages with your public defender are confidential and <strong>cannot be seen by the creditor</strong>.
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div style={styles.helpSection}>
        <div style={styles.helpTitle}>Your Defender Can Help With:</div>
        <ul style={styles.helpList}>
          <li>Understanding your rights under the FDCPA</li>
          <li>Reviewing debt validation</li>
          <li>Negotiation strategies</li>
          <li>Documentation guidance</li>
        </ul>
      </div>

      {/* Messages */}
      <div style={styles.messagesContainer}>
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            <div style={styles.dateDivider}>
              <span style={styles.dateText}>{date}</span>
            </div>
            {dateMessages.map((message) => (
              <div
                key={message.id}
                style={{
                  ...styles.messageRow,
                  justifyContent:
                    message.senderType === 'DEBTOR' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    ...(message.senderType === 'DEBTOR'
                      ? styles.ownMessage
                      : styles.defenderMessage),
                  }}
                >
                  {message.senderType === 'DEFENDER' && (
                    <div style={styles.defenderLabel}>
                      <span style={styles.smallShield}>🛡️</span> Your Defender
                    </div>
                  )}
                  <div style={styles.messageContent}>{message.content}</div>

                  {/* Attachments */}
                  {message.attachments.length > 0 && (
                    <div style={styles.attachments}>
                      {message.attachments.map((att) => (
                        <div
                          key={att.id}
                          style={styles.attachment}
                          onClick={() => handleDownload(att)}
                        >
                          <span style={styles.attachmentIcon}>
                            {getFileIcon(att.fileType)}
                          </span>
                          <div style={styles.attachmentInfo}>
                            <div style={styles.attachmentName}>{att.fileName}</div>
                            <div style={styles.attachmentSize}>
                              {formatFileSize(att.fileSize)}
                            </div>
                          </div>
                          <button style={styles.downloadButton}>Download</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={styles.messageFooter}>
                    <span style={styles.timestamp}>{formatTime(message.createdAt)}</span>
                    {message.senderType === 'DEBTOR' && (
                      <span style={styles.readReceipt}>
                        {message.readAt ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Typing indicator */}
        {defenderTyping && (
          <div style={styles.typingIndicator}>
            <span>Your defender is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected file preview */}
      {selectedFile && (
        <div style={styles.filePreview}>
          <span>{getFileIcon(selectedFile.type)}</span>
          <span style={styles.fileName}>{selectedFile.name}</span>
          <span style={styles.fileSize}>{formatFileSize(selectedFile.size)}</span>
          <button
            style={styles.removeFileButton}
            onClick={() => setSelectedFile(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Input */}
      <div style={styles.inputContainer}>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
        />
        <button
          style={styles.attachButton}
          onClick={() => fileInputRef.current?.click()}
        >
          📎
        </button>
        <input
          type="text"
          style={styles.textInput}
          placeholder="Type a message to your defender..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <button
          style={{
            ...styles.sendButton,
            opacity: !newMessage.trim() && !selectedFile ? 0.5 : 1,
          }}
          onClick={handleSendMessage}
          disabled={!newMessage.trim() && !selectedFile}
        >
          Send
        </button>
      </div>

      {/* Emergency Contact */}
      <div style={styles.emergencyContact}>
        Need immediate help?{' '}
        <a href={`mailto:${defender.email}`} style={styles.contactLink}>
          Email your defender
        </a>
        {defender.phone && (
          <>
            {' or '}
            <a href={`tel:${defender.phone}`} style={styles.contactLink}>
              Call {defender.phone}
            </a>
          </>
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
    maxHeight: '900px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#1a365d',
    color: '#fff',
  },
  defenderInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  defenderAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#4a90a4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 600,
  },
  defenderDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  defenderName: {
    fontWeight: 600,
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  shieldIcon: {
    fontSize: '18px',
  },
  smallShield: {
    fontSize: '14px',
  },
  defenderOrg: {
    fontSize: '13px',
    opacity: 0.9,
  },
  defenderSpecialty: {
    fontSize: '12px',
    opacity: 0.7,
  },
  infoButton: {
    border: 'none',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    cursor: 'pointer',
    fontSize: '18px',
  },
  privacyNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#d4edda',
    borderBottom: '1px solid #c3e6cb',
  },
  privacyIcon: {
    fontSize: '24px',
  },
  privacyText: {
    fontSize: '14px',
    color: '#155724',
  },
  privacySubtext: {
    fontSize: '13px',
    marginTop: '4px',
  },
  helpSection: {
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e0e0e0',
    fontSize: '13px',
  },
  helpTitle: {
    fontWeight: 600,
    marginBottom: '8px',
    color: '#333',
  },
  helpList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    backgroundColor: '#f5f5f5',
  },
  dateDivider: {
    display: 'flex',
    justifyContent: 'center',
    margin: '16px 0',
  },
  dateText: {
    fontSize: '12px',
    color: '#888',
    backgroundColor: '#e8e8e8',
    padding: '4px 12px',
    borderRadius: '12px',
  },
  messageRow: {
    display: 'flex',
    marginBottom: '12px',
    flexDirection: 'column',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: '12px 16px',
    borderRadius: '16px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  ownMessage: {
    backgroundColor: '#007bff',
    color: '#fff',
    borderBottomRightRadius: '4px',
    alignSelf: 'flex-end',
  },
  defenderMessage: {
    backgroundColor: '#fff',
    color: '#333',
    borderBottomLeftRadius: '4px',
    alignSelf: 'flex-start',
    border: '2px solid #1a365d',
  },
  defenderLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#1a365d',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  messageContent: {
    wordBreak: 'break-word',
    lineHeight: '1.5',
  },
  attachments: {
    marginTop: '10px',
  },
  attachment: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '4px',
  },
  attachmentIcon: {
    fontSize: '28px',
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: '14px',
    fontWeight: 500,
  },
  attachmentSize: {
    fontSize: '12px',
    color: '#888',
  },
  downloadButton: {
    padding: '6px 12px',
    fontSize: '12px',
    backgroundColor: '#1a365d',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  messageFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '4px',
    marginTop: '6px',
  },
  timestamp: {
    fontSize: '11px',
    opacity: 0.7,
  },
  readReceipt: {
    fontSize: '12px',
  },
  typingIndicator: {
    padding: '8px 16px',
    color: '#1a365d',
    fontStyle: 'italic',
    fontSize: '13px',
  },
  filePreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#f0f0f0',
    borderTop: '1px solid #e0e0e0',
  },
  fileName: {
    flex: 1,
    fontSize: '13px',
  },
  fileSize: {
    fontSize: '12px',
    color: '#888',
  },
  removeFileButton: {
    border: 'none',
    background: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#888',
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid #e0e0e0',
    backgroundColor: '#fff',
  },
  attachButton: {
    border: 'none',
    background: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px',
  },
  textInput: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #e0e0e0',
    borderRadius: '24px',
    fontSize: '14px',
    outline: 'none',
  },
  sendButton: {
    padding: '12px 24px',
    backgroundColor: '#1a365d',
    color: '#fff',
    border: 'none',
    borderRadius: '24px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  emergencyContact: {
    padding: '10px 16px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #e0e0e0',
    fontSize: '12px',
    color: '#666',
    textAlign: 'center',
  },
  contactLink: {
    color: '#1a365d',
    fontWeight: 500,
    textDecoration: 'none',
  },
};

export default DebtorDefenderChat;
