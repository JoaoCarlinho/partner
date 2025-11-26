/**
 * Defender Chat Component
 * Private messaging interface for defenders communicating with debtors
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Types
interface Message {
  id: string;
  assignmentId: string;
  senderId: string;
  senderType: 'DEFENDER' | 'DEBTOR';
  senderName: string;
  content: string;
  contentType: 'TEXT' | 'FILE' | 'SYSTEM';
  toneAnalysis?: {
    score: number;
    feedback: string[];
  } | null;
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

interface DefenderChatProps {
  assignmentId: string;
  currentUserId: string;
  currentUserType: 'DEFENDER' | 'DEBTOR';
  debtorName: string;
  defenderName: string;
}

// Mock data for development
const mockMessages: Message[] = [
  {
    id: '1',
    assignmentId: 'assign-001',
    senderId: 'defender-001',
    senderType: 'DEFENDER',
    senderName: 'Jane Smith',
    content: "Hi, I'm Jane from Legal Aid. I've been assigned to help you with your case.",
    contentType: 'TEXT',
    toneAnalysis: { score: 95, feedback: ['Professional and welcoming tone'] },
    attachments: [],
    readAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    assignmentId: 'assign-001',
    senderId: 'debtor-001',
    senderType: 'DEBTOR',
    senderName: 'John Doe',
    content: "Thank you! I'm really stressed about this debt.",
    contentType: 'TEXT',
    attachments: [],
    readAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 3300000).toISOString(),
  },
  {
    id: '3',
    assignmentId: 'assign-001',
    senderId: 'defender-001',
    senderType: 'DEFENDER',
    senderName: 'Jane Smith',
    content: "I understand. Let's go through your options together. First, I've reviewed your financial assessment.",
    contentType: 'TEXT',
    toneAnalysis: { score: 92, feedback: ['Good use of empathetic language'] },
    attachments: [],
    readAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 3000000).toISOString(),
  },
  {
    id: '4',
    assignmentId: 'assign-001',
    senderId: 'defender-001',
    senderType: 'DEFENDER',
    senderName: 'Jane Smith',
    content: "Here's a guide that explains your payment options.",
    contentType: 'FILE',
    toneAnalysis: { score: 88, feedback: [] },
    attachments: [
      {
        id: 'att-001',
        fileName: 'Payment_Options_Guide.pdf',
        fileType: 'application/pdf',
        fileSize: 245000,
      },
    ],
    readAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 2700000).toISOString(),
  },
];

export const DefenderChat: React.FC<DefenderChatProps> = ({
  assignmentId,
  currentUserId,
  currentUserType,
  debtorName,
  defenderName,
}) => {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [showToneAnalysis, setShowToneAnalysis] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const chatPartnerName = currentUserType === 'DEFENDER' ? debtorName : defenderName;

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      // In production, emit WebSocket event
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      // In production, emit WebSocket stop typing event
    }, 2000);
  }, [isTyping]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    const tempId = `temp-${Date.now()}`;
    const newMsg: Message = {
      id: tempId,
      assignmentId,
      senderId: currentUserId,
      senderType: currentUserType,
      senderName: currentUserType === 'DEFENDER' ? defenderName : debtorName,
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

    // Optimistic update
    setMessages((prev) => [...prev, newMsg]);
    setNewMessage('');
    setSelectedFile(null);
    setIsTyping(false);

    // In production, call API to send message
    // const response = await sendMessage({ assignmentId, content: newMessage });
    // setMessages(prev => prev.map(m => m.id === tempId ? response : m));
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File too large. Maximum size is 10MB.');
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain',
      ];

      if (!allowedTypes.includes(file.type)) {
        alert('File type not allowed.');
        return;
      }

      setSelectedFile(file);
    }
  };

  // Handle file download
  const handleDownload = async (attachment: Attachment) => {
    // In production, get presigned URL from API
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
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInfo}>
          <span style={styles.headerIcon}>💬</span>
          <span style={styles.headerTitle}>
            {currentUserType === 'DEFENDER'
              ? `Private Chat with ${debtorName}`
              : `Your Public Defender - ${defenderName}`}
          </span>
        </div>
        {currentUserType === 'DEFENDER' && (
          <label style={styles.toneToggle}>
            <input
              type="checkbox"
              checked={showToneAnalysis}
              onChange={(e) => setShowToneAnalysis(e.target.checked)}
            />
            Show Tone Analysis
          </label>
        )}
      </div>

      {/* Privacy Notice */}
      <div style={styles.privacyNotice}>
        <span style={styles.lockIcon}>🔒</span>
        <span>
          {currentUserType === 'DEFENDER'
            ? 'This is a private conversation. Messages are not visible to the creditor.'
            : 'Private Conversation - Messages with your public defender are confidential and cannot be seen by the creditor.'}
        </span>
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
                    message.senderId === currentUserId ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    ...(message.senderId === currentUserId
                      ? styles.ownMessage
                      : styles.otherMessage),
                  }}
                >
                  {message.senderId !== currentUserId && (
                    <div style={styles.senderName}>{message.senderName}</div>
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
                    {message.senderId === currentUserId && (
                      <span style={styles.readReceipt}>
                        {message.readAt ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tone Analysis (Defender only, own messages) */}
                {currentUserType === 'DEFENDER' &&
                  message.senderId === currentUserId &&
                  message.toneAnalysis &&
                  showToneAnalysis && (
                    <div style={styles.toneAnalysis}>
                      <span style={styles.toneScore}>
                        {message.toneAnalysis.score >= 90
                          ? '💡'
                          : message.toneAnalysis.score >= 70
                          ? '📝'
                          : '⚠️'}
                        Tone: {message.toneAnalysis.score}/100
                      </span>
                      {message.toneAnalysis.feedback.length > 0 && (
                        <div style={styles.toneFeedback}>
                          {message.toneAnalysis.feedback.join(' • ')}
                        </div>
                      )}
                    </div>
                  )}
              </div>
            ))}
          </div>
        ))}

        {/* Typing indicator */}
        {otherTyping && (
          <div style={styles.typingIndicator}>
            <span>{chatPartnerName} is typing...</span>
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
          disabled={uploading}
        >
          📎
        </button>
        <input
          type="text"
          style={styles.textInput}
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
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
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: '800px',
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
    backgroundColor: '#f8f9fa',
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerIcon: {
    fontSize: '20px',
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: '16px',
  },
  toneToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#666',
    cursor: 'pointer',
  },
  privacyNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#e8f4f8',
    color: '#0c5460',
    fontSize: '13px',
  },
  lockIcon: {
    fontSize: '16px',
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
    marginBottom: '8px',
    flexDirection: 'column',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: '10px 14px',
    borderRadius: '16px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  ownMessage: {
    backgroundColor: '#007bff',
    color: '#fff',
    borderBottomRightRadius: '4px',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#fff',
    color: '#333',
    borderBottomLeftRadius: '4px',
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '4px',
    color: '#555',
  },
  messageContent: {
    wordBreak: 'break-word',
    lineHeight: '1.4',
  },
  attachments: {
    marginTop: '8px',
  },
  attachment: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  attachmentIcon: {
    fontSize: '24px',
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: '13px',
    fontWeight: 500,
  },
  attachmentSize: {
    fontSize: '11px',
    opacity: 0.8,
  },
  downloadButton: {
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: 'rgba(255,255,255,0.3)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  messageFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '4px',
    marginTop: '4px',
  },
  timestamp: {
    fontSize: '11px',
    opacity: 0.7,
  },
  readReceipt: {
    fontSize: '12px',
  },
  toneAnalysis: {
    fontSize: '11px',
    color: '#666',
    marginTop: '4px',
    alignSelf: 'flex-end',
    maxWidth: '70%',
  },
  toneScore: {
    display: 'inline-block',
    backgroundColor: '#f0f0f0',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  toneFeedback: {
    marginTop: '2px',
    fontStyle: 'italic',
  },
  typingIndicator: {
    padding: '8px 16px',
    color: '#888',
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
    padding: '10px 14px',
    border: '1px solid #e0e0e0',
    borderRadius: '20px',
    fontSize: '14px',
    outline: 'none',
  },
  sendButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontWeight: 500,
  },
};

export default DefenderChat;
