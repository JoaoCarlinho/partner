/**
 * Defender Case View Service
 * Provides read-only access to debtor case information for assigned defenders
 */

import { hasDefenderAccess } from './assignmentService';

// In-memory stores (use database in production)
const caseStore = new Map<string, CaseDetails>();
const paymentPlanStore = new Map<string, PaymentPlan>();
const communicationStore = new Map<string, Communication[]>();

export interface CaseDetails {
  id: string;
  debtorId: string;
  creditorId: string;
  creditorName: string;
  originalAmount: number;
  currentAmount: number;
  debtAge: number; // months
  status: 'ACTIVE' | 'IN_NEGOTIATION' | 'RESOLVED' | 'DEFAULTED';
  createdAt: Date;
  updatedAt: Date;
}

export interface DebtorSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  financialProfile?: FinancialProfile;
  communicationPreferences?: CommunicationPreferences;
  assessmentCompleted: boolean;
}

export interface FinancialProfile {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  employmentStatus?: string;
  dependents?: number;
  monthlyDisposable?: number;
}

export interface CommunicationPreferences {
  preferredMethod: 'EMAIL' | 'SMS' | 'IN_APP';
  quietHoursStart?: string;
  quietHoursEnd?: string;
  language: string;
}

export interface PaymentPlan {
  id: string;
  caseId: string;
  type: 'INSTALLMENT' | 'LUMP_SUM' | 'SETTLEMENT';
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  nextPaymentDate?: Date;
  nextPaymentAmount?: number;
  status: 'PROPOSED' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';
  progress: number;
  payments: PaymentRecord[];
  createdAt: Date;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: 'PENDING' | 'PAID' | 'MISSED' | 'PARTIAL';
}

export interface Communication {
  id: string;
  caseId: string;
  type: 'MESSAGE' | 'LETTER' | 'NOTIFICATION';
  direction: 'INBOUND' | 'OUTBOUND';
  subject?: string;
  preview: string;
  timestamp: Date;
  read: boolean;
}

export interface CaseTimeline {
  events: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  type: 'CASE_CREATED' | 'LETTER_SENT' | 'DEBTOR_RESPONSE' | 'PLAN_PROPOSED' |
        'PLAN_ACCEPTED' | 'PAYMENT_MADE' | 'PAYMENT_MISSED' | 'DEFENDER_ASSIGNED' |
        'MESSAGE_SENT' | 'NOTE_ADDED';
  description: string;
  timestamp: Date;
  actor?: string;
  metadata?: Record<string, unknown>;
}

export interface DefenderCaseView {
  case: CaseDetails;
  debtor: DebtorSummary;
  paymentPlan?: PaymentPlan;
  recentCommunications: Communication[];
  timeline: CaseTimeline;
  assignment: {
    id: string;
    assignedAt: Date;
    status: string;
  };
}

/**
 * Get case view for a defender
 * Ensures defender has access through valid assignment
 */
export async function getDefenderCaseView(
  defenderId: string,
  caseId: string
): Promise<DefenderCaseView> {
  // Get case details
  const caseDetails = await getCaseDetails(caseId);
  if (!caseDetails) {
    throw new Error('Case not found');
  }

  // Verify defender has access
  const hasAccess = await hasDefenderAccess(defenderId, caseDetails.debtorId);
  if (!hasAccess) {
    throw new Error('Not authorized to view this case');
  }

  // Get debtor summary (filtered for defender view)
  const debtor = await getDebtorSummary(caseDetails.debtorId);

  // Get payment plan if exists
  const paymentPlan = await getPaymentPlan(caseId);

  // Get recent communications
  const communications = await getRecentCommunications(caseId, 10);

  // Get timeline
  const timeline = await getCaseTimeline(caseId);

  return {
    case: caseDetails,
    debtor,
    paymentPlan,
    recentCommunications: communications,
    timeline,
    assignment: {
      id: `assign_${defenderId}_${caseId}`,
      assignedAt: new Date(),
      status: 'ACTIVE',
    },
  };
}

/**
 * Get case details
 */
async function getCaseDetails(caseId: string): Promise<CaseDetails | null> {
  // Check in-memory store
  let caseDetails = caseStore.get(caseId);

  if (!caseDetails) {
    // Return mock data for development
    caseDetails = {
      id: caseId,
      debtorId: `debtor_${caseId}`,
      creditorId: 'creditor_1',
      creditorName: 'ABC Collections',
      originalAmount: 2500,
      currentAmount: 2450,
      debtAge: 6,
      status: 'IN_NEGOTIATION',
      createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };
    caseStore.set(caseId, caseDetails);
  }

  return caseDetails;
}

/**
 * Get debtor summary (filtered for defender view)
 * Excludes sensitive financial details not relevant to defender role
 */
async function getDebtorSummary(debtorId: string): Promise<DebtorSummary> {
  // Return mock data for development
  return {
    id: debtorId,
    firstName: 'John',
    lastName: 'D.',
    email: 'j***@email.com', // Partially masked
    phone: '***-***-1234', // Partially masked
    financialProfile: {
      monthlyIncome: 3500,
      monthlyExpenses: 2800,
      employmentStatus: 'Employed',
      dependents: 2,
      monthlyDisposable: 700,
    },
    communicationPreferences: {
      preferredMethod: 'EMAIL',
      quietHoursStart: '21:00',
      quietHoursEnd: '08:00',
      language: 'en',
    },
    assessmentCompleted: true,
  };
}

/**
 * Get payment plan for a case
 */
async function getPaymentPlan(caseId: string): Promise<PaymentPlan | undefined> {
  let plan = paymentPlanStore.get(caseId);

  if (!plan) {
    // Return mock data for development
    const payments: PaymentRecord[] = [
      { id: 'pay_1', amount: 200, dueDate: new Date('2025-01-15'), paidDate: new Date('2025-01-14'), status: 'PAID' },
      { id: 'pay_2', amount: 200, dueDate: new Date('2025-02-15'), paidDate: new Date('2025-02-16'), status: 'PAID' },
      { id: 'pay_3', amount: 200, dueDate: new Date('2025-03-15'), status: 'PENDING' },
      { id: 'pay_4', amount: 200, dueDate: new Date('2025-04-15'), status: 'PENDING' },
    ];

    plan = {
      id: `plan_${caseId}`,
      caseId,
      type: 'INSTALLMENT',
      totalAmount: 2450,
      paidAmount: 400,
      remainingAmount: 2050,
      paymentFrequency: 'MONTHLY',
      nextPaymentDate: new Date('2025-03-15'),
      nextPaymentAmount: 200,
      status: 'ACTIVE',
      progress: 16.3,
      payments,
      createdAt: new Date('2025-01-01'),
    };
    paymentPlanStore.set(caseId, plan);
  }

  return plan;
}

/**
 * Get recent communications
 */
async function getRecentCommunications(
  caseId: string,
  limit: number
): Promise<Communication[]> {
  let communications = communicationStore.get(caseId);

  if (!communications) {
    // Return mock data for development
    communications = [
      {
        id: 'comm_1',
        caseId,
        type: 'MESSAGE',
        direction: 'INBOUND',
        subject: 'Question about payment',
        preview: 'Hi, I wanted to ask about my next payment...',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        read: true,
      },
      {
        id: 'comm_2',
        caseId,
        type: 'MESSAGE',
        direction: 'OUTBOUND',
        subject: 'Payment reminder',
        preview: 'This is a reminder about your upcoming payment...',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        read: true,
      },
      {
        id: 'comm_3',
        caseId,
        type: 'LETTER',
        direction: 'OUTBOUND',
        subject: 'Initial Contact',
        preview: 'Dear John, we are reaching out regarding...',
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        read: true,
      },
    ];
    communicationStore.set(caseId, communications);
  }

  return communications
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Get case timeline
 */
async function getCaseTimeline(caseId: string): Promise<CaseTimeline> {
  // Return mock timeline for development
  const events: TimelineEvent[] = [
    {
      id: 'evt_1',
      type: 'DEFENDER_ASSIGNED',
      description: 'Public defender assigned to case',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      actor: 'System',
    },
    {
      id: 'evt_2',
      type: 'PAYMENT_MADE',
      description: 'Payment of $200 received',
      timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      metadata: { amount: 200 },
    },
    {
      id: 'evt_3',
      type: 'PLAN_ACCEPTED',
      description: 'Payment plan accepted by debtor',
      timestamp: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'evt_4',
      type: 'PLAN_PROPOSED',
      description: 'Monthly installment plan proposed',
      timestamp: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
      metadata: { planType: 'INSTALLMENT', amount: 200, frequency: 'MONTHLY' },
    },
    {
      id: 'evt_5',
      type: 'DEBTOR_RESPONSE',
      description: 'Debtor completed financial assessment',
      timestamp: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'evt_6',
      type: 'LETTER_SENT',
      description: 'Initial contact letter sent',
      timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'evt_7',
      type: 'CASE_CREATED',
      description: 'Case created',
      timestamp: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    },
  ];

  return { events };
}

/**
 * Get payment plan summary for defender
 */
export async function getPaymentPlanSummary(
  defenderId: string,
  caseId: string
): Promise<{
  plan: PaymentPlan | null;
  onTimePayments: number;
  missedPayments: number;
  nextPayment?: { date: Date; amount: number };
}> {
  const caseDetails = await getCaseDetails(caseId);
  if (!caseDetails) {
    throw new Error('Case not found');
  }

  const hasAccess = await hasDefenderAccess(defenderId, caseDetails.debtorId);
  if (!hasAccess) {
    throw new Error('Not authorized to view this case');
  }

  const plan = await getPaymentPlan(caseId);

  if (!plan) {
    return {
      plan: null,
      onTimePayments: 0,
      missedPayments: 0,
    };
  }

  const onTimePayments = plan.payments.filter(
    (p) => p.status === 'PAID' && p.paidDate && p.paidDate <= p.dueDate
  ).length;

  const missedPayments = plan.payments.filter((p) => p.status === 'MISSED').length;

  const nextPendingPayment = plan.payments.find((p) => p.status === 'PENDING');

  return {
    plan,
    onTimePayments,
    missedPayments,
    nextPayment: nextPendingPayment
      ? { date: nextPendingPayment.dueDate, amount: nextPendingPayment.amount }
      : undefined,
  };
}

/**
 * Get debtor's FDCPA rights summary for defender reference
 */
export function getFDCPARightsSummary(): {
  rights: string[];
  keyDates: { name: string; description: string }[];
  prohibitedPractices: string[];
} {
  return {
    rights: [
      'Right to request debt validation within 30 days of initial contact',
      'Right to dispute the debt in writing',
      'Right to request that the collector stop contacting them',
      'Right to sue collectors who violate FDCPA',
      'Right to be free from harassment and abuse',
    ],
    keyDates: [
      {
        name: '30-Day Validation Period',
        description: 'Debtor can request debt validation within 30 days of initial contact',
      },
      {
        name: 'Statute of Limitations',
        description: 'Varies by state, typically 3-6 years for most debt types',
      },
    ],
    prohibitedPractices: [
      'Calling before 8am or after 9pm',
      'Threatening violence or criminal prosecution',
      'Using obscene language',
      'Misrepresenting the amount owed',
      'Contacting third parties about the debt',
      'Continuing contact after written cease request',
    ],
  };
}

/**
 * Get recommended actions for defender
 */
export async function getRecommendedActions(
  defenderId: string,
  caseId: string
): Promise<{
  priority: 'high' | 'medium' | 'low';
  actions: { action: string; reason: string }[];
}> {
  const caseView = await getDefenderCaseView(defenderId, caseId);
  const actions: { action: string; reason: string }[] = [];
  let priority: 'high' | 'medium' | 'low' = 'low';

  // Check for missed payments
  const missedPayments = caseView.paymentPlan?.payments.filter(
    (p) => p.status === 'MISSED'
  ).length || 0;

  if (missedPayments > 0) {
    actions.push({
      action: 'Reach out about missed payments',
      reason: `${missedPayments} payment(s) missed - debtor may need assistance`,
    });
    priority = 'high';
  }

  // Check for upcoming payment
  if (caseView.paymentPlan?.nextPaymentDate) {
    const daysUntilPayment = Math.ceil(
      (caseView.paymentPlan.nextPaymentDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilPayment <= 3 && daysUntilPayment > 0) {
      actions.push({
        action: 'Send payment reminder',
        reason: `Payment of $${caseView.paymentPlan.nextPaymentAmount} due in ${daysUntilPayment} days`,
      });
      if (priority !== 'high') priority = 'medium';
    }
  }

  // Check communication history
  const lastComm = caseView.recentCommunications[0];
  if (lastComm) {
    const daysSinceLastComm = Math.ceil(
      (Date.now() - lastComm.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastComm > 7) {
      actions.push({
        action: 'Follow up with debtor',
        reason: `No communication in ${daysSinceLastComm} days`,
      });
      if (priority !== 'high') priority = 'medium';
    }
  }

  // Check if assessment completed
  if (!caseView.debtor.assessmentCompleted) {
    actions.push({
      action: 'Encourage financial assessment completion',
      reason: 'Assessment not completed - needed for personalized plan',
    });
  }

  if (actions.length === 0) {
    actions.push({
      action: 'Monitor case progress',
      reason: 'No immediate actions required',
    });
  }

  return { priority, actions };
}
