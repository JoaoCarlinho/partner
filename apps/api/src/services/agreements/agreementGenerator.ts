/**
 * Agreement Generator Service
 * Generates payment plan agreement documents
 */

/**
 * Agreement data structure
 */
export interface Agreement {
  id: string;
  planId: string;
  demandId: string;
  creditorId: string;
  debtorId: string;
  status: AgreementStatus;
  terms: AgreementTerms;
  signatures: {
    creditor?: SignatureRecord;
    debtor?: SignatureRecord;
  };
  documentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

/**
 * Agreement status
 */
export enum AgreementStatus {
  DRAFT = 'DRAFT',
  PENDING_SIGNATURES = 'PENDING_SIGNATURES',
  PARTIALLY_SIGNED = 'PARTIALLY_SIGNED',
  EXECUTED = 'EXECUTED',
  VOIDED = 'VOIDED',
  EXPIRED = 'EXPIRED',
}

/**
 * Agreement terms
 */
export interface AgreementTerms {
  totalAmount: number;
  downPayment: number;
  paymentAmount: number;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  numPayments: number;
  startDate: string;
  endDate: string;
  lateFeePercent: number;
  gracePeriodDays: number;
  defaultThreshold: number; // Number of missed payments before default
  specialConditions?: string[];
}

/**
 * Signature record
 */
export interface SignatureRecord {
  signedBy: string;
  signedAt: Date;
  ipAddress: string;
  userAgent: string;
  signatureHash: string;
}

/**
 * Party information
 */
export interface PartyInfo {
  id: string;
  name: string;
  email: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  phone?: string;
}

/**
 * Generate agreement document content
 */
export function generateAgreementDocument(
  agreement: Agreement,
  creditor: PartyInfo,
  debtor: PartyInfo
): string {
  const terms = agreement.terms;
  const frequencyLabel =
    terms.frequency === 'WEEKLY'
      ? 'weekly'
      : terms.frequency === 'BIWEEKLY'
        ? 'bi-weekly'
        : 'monthly';

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return `
PAYMENT AGREEMENT

Agreement ID: ${agreement.id}
Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

PARTIES

CREDITOR:
${creditor.name}
${creditor.address ? `${creditor.address.street}\n${creditor.address.city}, ${creditor.address.state} ${creditor.address.zip}` : ''}
Email: ${creditor.email}
${creditor.phone ? `Phone: ${creditor.phone}` : ''}

DEBTOR:
${debtor.name}
${debtor.address ? `${debtor.address.street}\n${debtor.address.city}, ${debtor.address.state} ${debtor.address.zip}` : ''}
Email: ${debtor.email}
${debtor.phone ? `Phone: ${debtor.phone}` : ''}

RECITALS

WHEREAS, Debtor owes Creditor the sum of ${formatCurrency(terms.totalAmount)} ("Debt"); and

WHEREAS, the parties wish to establish a payment plan for the repayment of this Debt;

NOW, THEREFORE, in consideration of the mutual covenants contained herein, the parties agree as follows:

1. PAYMENT TERMS

1.1 Total Debt Amount: ${formatCurrency(terms.totalAmount)}

1.2 Down Payment: ${formatCurrency(terms.downPayment)} due upon execution of this Agreement

1.3 Remaining Balance: ${formatCurrency(terms.totalAmount - terms.downPayment)}

1.4 Payment Schedule:
    - Amount: ${formatCurrency(terms.paymentAmount)} ${frequencyLabel}
    - Number of Payments: ${terms.numPayments}
    - First Payment Due: ${formatDate(terms.startDate)}
    - Final Payment Due: ${formatDate(terms.endDate)}

2. LATE PAYMENTS

2.1 Grace Period: Payments received within ${terms.gracePeriodDays} days of the due date shall not be considered late.

2.2 Late Fee: A late fee of ${terms.lateFeePercent}% of the payment amount shall be assessed for payments received after the grace period.

3. DEFAULT

3.1 Default shall occur if:
    (a) Debtor fails to make ${terms.defaultThreshold} consecutive payments; or
    (b) Debtor fails to cure any missed payment within 30 days of written notice from Creditor.

3.2 Upon default, the entire remaining balance becomes immediately due and payable.

4. MODIFICATIONS

4.1 Any modification to this Agreement must be in writing and signed by both parties.

5. GOVERNING LAW

5.1 This Agreement shall be governed by the laws of the state in which the Creditor is located.

${terms.specialConditions && terms.specialConditions.length > 0 ? `
6. SPECIAL CONDITIONS

${terms.specialConditions.map((c, i) => `6.${i + 1} ${c}`).join('\n\n')}
` : ''}

SIGNATURES

By signing below, the parties acknowledge that they have read, understand, and agree to be bound by the terms of this Agreement.

CREDITOR:

_________________________________
${creditor.name}
Date: _______________

DEBTOR:

_________________________________
${debtor.name}
Date: _______________
`.trim();
}

/**
 * Generate signature hash
 */
export function generateSignatureHash(
  agreementId: string,
  signerId: string,
  timestamp: Date,
  ipAddress: string
): string {
  // In production, use proper cryptographic hashing
  const data = `${agreementId}:${signerId}:${timestamp.toISOString()}:${ipAddress}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `SIG-${Math.abs(hash).toString(16).toUpperCase().padStart(12, '0')}`;
}

/**
 * Validate agreement terms
 */
export function validateAgreementTerms(terms: AgreementTerms): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (terms.totalAmount <= 0) {
    errors.push('Total amount must be positive');
  }

  if (terms.downPayment < 0) {
    errors.push('Down payment cannot be negative');
  }

  if (terms.downPayment >= terms.totalAmount) {
    errors.push('Down payment cannot exceed total amount');
  }

  if (terms.paymentAmount <= 0) {
    errors.push('Payment amount must be positive');
  }

  if (terms.numPayments <= 0) {
    errors.push('Number of payments must be positive');
  }

  if (terms.lateFeePercent < 0 || terms.lateFeePercent > 25) {
    errors.push('Late fee must be between 0% and 25%');
  }

  if (terms.gracePeriodDays < 0 || terms.gracePeriodDays > 30) {
    errors.push('Grace period must be between 0 and 30 days');
  }

  if (terms.defaultThreshold < 1 || terms.defaultThreshold > 6) {
    errors.push('Default threshold must be between 1 and 6 missed payments');
  }

  const start = new Date(terms.startDate);
  const end = new Date(terms.endDate);
  if (end <= start) {
    errors.push('End date must be after start date');
  }

  // Verify math
  const calculatedTotal = terms.downPayment + terms.paymentAmount * terms.numPayments;
  const tolerance = 0.01 * terms.totalAmount; // 1% tolerance for rounding
  if (Math.abs(calculatedTotal - terms.totalAmount) > tolerance) {
    errors.push('Payment terms do not add up to total amount');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if agreement can be signed
 */
export function canSign(
  agreement: Agreement,
  signerId: string,
  signerRole: 'creditor' | 'debtor'
): { allowed: boolean; reason?: string } {
  if (agreement.status === AgreementStatus.VOIDED) {
    return { allowed: false, reason: 'Agreement has been voided' };
  }

  if (agreement.status === AgreementStatus.EXPIRED) {
    return { allowed: false, reason: 'Agreement has expired' };
  }

  if (agreement.status === AgreementStatus.EXECUTED) {
    return { allowed: false, reason: 'Agreement is already fully executed' };
  }

  if (new Date() > agreement.expiresAt) {
    return { allowed: false, reason: 'Agreement has expired' };
  }

  const existingSignature = agreement.signatures[signerRole];
  if (existingSignature) {
    return { allowed: false, reason: 'You have already signed this agreement' };
  }

  // Verify signer identity
  if (signerRole === 'creditor' && signerId !== agreement.creditorId) {
    return { allowed: false, reason: 'You are not authorized to sign as creditor' };
  }

  if (signerRole === 'debtor' && signerId !== agreement.debtorId) {
    return { allowed: false, reason: 'You are not authorized to sign as debtor' };
  }

  return { allowed: true };
}

/**
 * Generate agreement summary for display
 */
export function generateAgreementSummary(agreement: Agreement): {
  title: string;
  status: string;
  keyTerms: Array<{ label: string; value: string }>;
  signatureStatus: {
    creditor: 'pending' | 'signed';
    debtor: 'pending' | 'signed';
  };
} {
  const terms = agreement.terms;
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return {
    title: `Payment Agreement #${agreement.id.slice(-8).toUpperCase()}`,
    status: agreement.status,
    keyTerms: [
      { label: 'Total Amount', value: formatCurrency(terms.totalAmount) },
      { label: 'Down Payment', value: formatCurrency(terms.downPayment) },
      {
        label: 'Regular Payment',
        value: `${formatCurrency(terms.paymentAmount)} ${terms.frequency.toLowerCase()}`,
      },
      { label: 'Number of Payments', value: terms.numPayments.toString() },
      { label: 'Start Date', value: new Date(terms.startDate).toLocaleDateString() },
      { label: 'End Date', value: new Date(terms.endDate).toLocaleDateString() },
      { label: 'Late Fee', value: `${terms.lateFeePercent}%` },
      { label: 'Grace Period', value: `${terms.gracePeriodDays} days` },
    ],
    signatureStatus: {
      creditor: agreement.signatures.creditor ? 'signed' : 'pending',
      debtor: agreement.signatures.debtor ? 'signed' : 'pending',
    },
  };
}
