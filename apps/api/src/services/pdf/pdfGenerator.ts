/**
 * PDF Generator Service
 * Generates PDF documents for demand letters using PDFKit
 */

import PDFDocument from 'pdfkit';

/**
 * Letterhead configuration
 */
export interface Letterhead {
  firmName: string;
  firmAddress?: string;
  firmPhone?: string;
  firmEmail?: string;
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  reference: string;
  date: string;
  caseId?: string;
  recipientName?: string;
  recipientAddress?: string;
}

/**
 * Approval signature data
 */
export interface ApprovalSignature {
  approverName: string;
  approverEmail: string;
  approvedAt: string;
  signature?: string;  // Optional typed signature
  ipAddress?: string;
}

/**
 * PDF generation options
 */
export interface PDFOptions {
  letterhead?: Letterhead;
  content: string;
  metadata: DocumentMetadata;
  approval?: ApprovalSignature;
  complianceScore?: number;
  includePageNumbers?: boolean;
}

/**
 * Generate a PDF for a demand letter
 */
export function generateLetterPDF(options: PDFOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'letter',
        margins: {
          top: 72,      // 1 inch
          bottom: 72,
          left: 72,
          right: 72,
        },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add letterhead if provided
      if (options.letterhead) {
        addLetterhead(doc, options.letterhead);
      }

      // Add date and reference
      addDocumentHeader(doc, options.metadata);

      // Add recipient if provided
      if (options.metadata.recipientName) {
        addRecipient(doc, options.metadata);
      }

      // Add main content
      addContent(doc, options.content);

      // Add approval signature if approved
      if (options.approval) {
        addApprovalSignature(doc, options.approval);
      }

      // Add page numbers if requested
      if (options.includePageNumbers !== false) {
        addPageNumbers(doc);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Add firm letterhead to the document
 */
function addLetterhead(doc: typeof PDFDocument.prototype, letterhead: Letterhead): void {
  const startY = doc.y;

  // Firm name - bold and larger
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(letterhead.firmName, { align: 'center' });

  // Address
  if (letterhead.firmAddress) {
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(letterhead.firmAddress, { align: 'center' });
  }

  // Contact info on one line
  const contactParts: string[] = [];
  if (letterhead.firmPhone) contactParts.push(`Tel: ${letterhead.firmPhone}`);
  if (letterhead.firmEmail) contactParts.push(`Email: ${letterhead.firmEmail}`);

  if (contactParts.length > 0) {
    doc
      .fontSize(9)
      .text(contactParts.join(' | '), { align: 'center' });
  }

  // Add horizontal line
  doc.moveDown(0.5);
  const lineY = doc.y;
  doc
    .moveTo(72, lineY)
    .lineTo(540, lineY)
    .strokeColor('#cccccc')
    .stroke();

  doc.moveDown(1.5);
}

/**
 * Add document header with date and reference
 */
function addDocumentHeader(doc: typeof PDFDocument.prototype, metadata: DocumentMetadata): void {
  doc
    .fontSize(10)
    .font('Helvetica');

  doc.text(`Date: ${metadata.date}`);
  doc.text(`Reference: ${metadata.reference}`);

  if (metadata.caseId) {
    doc.text(`Case ID: ${metadata.caseId}`);
  }

  doc.moveDown(1.5);
}

/**
 * Add recipient information
 */
function addRecipient(doc: typeof PDFDocument.prototype, metadata: DocumentMetadata): void {
  doc
    .fontSize(11)
    .font('Helvetica');

  if (metadata.recipientName) {
    doc.text(metadata.recipientName);
  }

  if (metadata.recipientAddress) {
    doc.text(metadata.recipientAddress);
  }

  doc.moveDown(1.5);
}

/**
 * Add main letter content
 */
function addContent(doc: typeof PDFDocument.prototype, content: string): void {
  doc
    .fontSize(11)
    .font('Helvetica')
    .text(content, {
      align: 'justify',
      lineGap: 3,
    });

  doc.moveDown(2);
}

/**
 * Add approval signature block
 */
function addApprovalSignature(doc: typeof PDFDocument.prototype, approval: ApprovalSignature): void {
  // Check if we need a new page
  if (doc.y > 650) {
    doc.addPage();
  }

  doc.moveDown(1);

  // Signature line
  doc
    .moveTo(72, doc.y)
    .lineTo(300, doc.y)
    .strokeColor('#000000')
    .stroke();

  doc.moveDown(0.3);

  // Approval details
  doc
    .fontSize(9)
    .font('Helvetica');

  doc.text(`Approved by: ${approval.approverName}`);
  doc.text(`Email: ${approval.approverEmail}`);
  doc.text(`Date: ${approval.approvedAt}`);

  if (approval.signature) {
    doc.moveDown(0.5);
    doc.font('Helvetica-Oblique').text(`Signature: ${approval.signature}`);
  }

  // Verification footer
  doc.moveDown(1);
  doc
    .fontSize(8)
    .fillColor('#666666')
    .text('This document has been electronically approved and is legally binding.', {
      align: 'center',
    });

  if (approval.ipAddress) {
    doc.text(`Verification: Signed from IP ${maskIpAddress(approval.ipAddress)}`, {
      align: 'center',
    });
  }
}

/**
 * Add page numbers to all pages
 */
function addPageNumbers(doc: typeof PDFDocument.prototype): void {
  const range = doc.bufferedPageRange();

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    // Position at bottom center
    doc
      .fontSize(9)
      .fillColor('#999999')
      .text(
        `Page ${i + 1} of ${range.count}`,
        72,
        740,
        {
          width: 468,
          align: 'center',
        }
      );
  }
}

/**
 * Mask IP address for privacy
 */
function maskIpAddress(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return '***.***.***';
}

/**
 * Generate a simple preview PDF (no approval signature)
 */
export function generatePreviewPDF(options: Omit<PDFOptions, 'approval'>): Promise<Buffer> {
  return generateLetterPDF({
    ...options,
    approval: undefined,
  });
}

/**
 * Calculate content hash for caching
 */
export function calculateContentHash(content: string): string {
  const { createHash } = require('crypto');
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}
