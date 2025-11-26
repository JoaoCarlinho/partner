/**
 * Outcome Capture Service
 * Captures plan outcomes and triggers learning pipeline events
 */

// In-memory store for development (use database in production)
const outcomeStore = new Map<string, PlanOutcome>();
const eventQueue: LearningEvent[] = [];

export type OutcomeType = 'COMPLETED' | 'DEFAULTED' | 'PARTIAL' | 'ABANDONED';

export interface PlanOutcome {
  id: string;
  planId: string;
  debtorProfileId: string;
  outcomeType: OutcomeType;
  collectionRate: number;
  onTimePaymentRate: number;
  avgDaysLate: number;
  totalCommunications: number;
  resolutionDays: number;
  planType: string;
  originalRecommendationId?: string;
  capturedAt: Date;
}

export interface ScheduledPayment {
  id: string;
  planId: string;
  dueDate: Date;
  amount: number;
  status: 'PENDING' | 'PAID' | 'MISSED' | 'PARTIAL';
  paidAmount?: number;
  paidDate?: Date;
}

export interface PaymentPlan {
  id: string;
  debtorProfileId: string;
  caseId: string;
  totalAmount: number;
  type: string;
  recommendationId?: string;
  createdAt: Date;
  status: 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED';
}

export interface LearningEvent {
  id: string;
  type: 'OUTCOME_CAPTURED' | 'EMBEDDING_UPDATE_REQUESTED' | 'RETRAINING_TRIGGERED' | 'AB_TEST_CONCLUDED';
  payload: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Capture outcome when a plan completes, defaults, or is abandoned
 */
export async function captureOutcome(
  plan: PaymentPlan,
  payments: ScheduledPayment[]
): Promise<PlanOutcome> {
  const totalExpected = plan.totalAmount;
  const totalCollected = payments
    .filter((p) => p.status === 'PAID' || p.status === 'PARTIAL')
    .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

  const paidPayments = payments.filter((p) => p.status === 'PAID');
  const onTimePayments = paidPayments.filter((p) => {
    if (!p.paidDate) return false;
    return new Date(p.paidDate) <= new Date(p.dueDate);
  }).length;

  const latePayments = paidPayments.filter((p) => {
    if (!p.paidDate) return false;
    return new Date(p.paidDate) > new Date(p.dueDate);
  });

  const avgDaysLate =
    latePayments.length > 0
      ? Math.round(
          latePayments.reduce((sum, p) => {
            const dueDate = new Date(p.dueDate);
            const paidDate = new Date(p.paidDate!);
            return sum + (paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / latePayments.length
        )
      : 0;

  const resolutionDays = Math.round(
    (Date.now() - plan.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Count communications for the case (mock implementation)
  const totalCommunications = await countCommunications(plan.caseId);

  const outcome: PlanOutcome = {
    id: generateId(),
    planId: plan.id,
    debtorProfileId: plan.debtorProfileId,
    outcomeType: determineOutcomeType(payments),
    collectionRate: totalExpected > 0 ? totalCollected / totalExpected : 0,
    onTimePaymentRate: paidPayments.length > 0 ? onTimePayments / paidPayments.length : 0,
    avgDaysLate,
    totalCommunications,
    resolutionDays,
    planType: plan.type,
    originalRecommendationId: plan.recommendationId,
    capturedAt: new Date(),
  };

  // Store outcome
  outcomeStore.set(outcome.id, outcome);

  // Emit event for embedding update
  await emitLearningEvent({
    id: generateId(),
    type: 'OUTCOME_CAPTURED',
    payload: { outcome },
    createdAt: new Date(),
  });

  return outcome;
}

/**
 * Determine outcome type based on payment history
 */
export function determineOutcomeType(payments: ScheduledPayment[]): OutcomeType {
  if (payments.length === 0) return 'ABANDONED';

  const paidCount = payments.filter((p) => p.status === 'PAID').length;
  const missedCount = payments.filter((p) => p.status === 'MISSED').length;
  const totalCount = payments.length;

  // All payments completed
  if (paidCount === totalCount) return 'COMPLETED';

  // Two or more consecutive missed payments indicates default
  if (missedCount >= 2 && hasConsecutiveMissed(payments, 2)) return 'DEFAULTED';

  // Some payments made but not all
  if (paidCount > 0) return 'PARTIAL';

  // No payments made
  return 'ABANDONED';
}

/**
 * Check if there are N consecutive missed payments
 */
export function hasConsecutiveMissed(payments: ScheduledPayment[], n: number): boolean {
  const sorted = [...payments].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  let consecutiveCount = 0;
  for (const payment of sorted) {
    if (payment.status === 'MISSED') {
      consecutiveCount++;
      if (consecutiveCount >= n) return true;
    } else {
      consecutiveCount = 0;
    }
  }

  return false;
}

/**
 * Count communications for a case
 */
async function countCommunications(caseId: string): Promise<number> {
  // Mock implementation - in production, query messages table
  // Return a reasonable default for development
  return Math.floor(Math.random() * 20) + 5;
}

/**
 * Emit a learning event to the queue
 */
async function emitLearningEvent(event: LearningEvent): Promise<void> {
  eventQueue.push(event);

  // In production, this would send to SQS
  // await sqsClient.send(new SendMessageCommand({
  //   QueueUrl: process.env.LEARNING_QUEUE_URL,
  //   MessageBody: JSON.stringify(event)
  // }));
}

/**
 * Get outcome by ID
 */
export async function getOutcome(outcomeId: string): Promise<PlanOutcome | null> {
  return outcomeStore.get(outcomeId) || null;
}

/**
 * Get outcome by plan ID
 */
export async function getOutcomeByPlanId(planId: string): Promise<PlanOutcome | null> {
  for (const outcome of outcomeStore.values()) {
    if (outcome.planId === planId) {
      return outcome;
    }
  }
  return null;
}

/**
 * Get all outcomes for a profile
 */
export async function getProfileOutcomes(profileId: string): Promise<PlanOutcome[]> {
  const outcomes: PlanOutcome[] = [];
  for (const outcome of outcomeStore.values()) {
    if (outcome.debtorProfileId === profileId) {
      outcomes.push(outcome);
    }
  }
  return outcomes.sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
}

/**
 * Get outcomes within a date range
 */
export async function getOutcomesByDateRange(
  startDate: Date,
  endDate: Date
): Promise<PlanOutcome[]> {
  const outcomes: PlanOutcome[] = [];
  for (const outcome of outcomeStore.values()) {
    if (outcome.capturedAt >= startDate && outcome.capturedAt <= endDate) {
      outcomes.push(outcome);
    }
  }
  return outcomes.sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
}

/**
 * Get pending learning events
 */
export function getPendingEvents(): LearningEvent[] {
  return [...eventQueue];
}

/**
 * Clear processed events
 */
export function clearProcessedEvents(eventIds: string[]): void {
  const idSet = new Set(eventIds);
  for (let i = eventQueue.length - 1; i >= 0; i--) {
    if (idSet.has(eventQueue[i].id)) {
      eventQueue.splice(i, 1);
    }
  }
}

/**
 * Create outcome snapshot for embedding update
 */
export function createOutcomeSnapshot(outcome: PlanOutcome): Record<string, unknown> {
  return {
    outcome: outcome.outcomeType.toLowerCase(),
    resolution_days: outcome.resolutionDays,
    collection_rate: outcome.collectionRate,
    on_time_rate: outcome.onTimePaymentRate,
    avg_days_late: outcome.avgDaysLate,
    communication_count: outcome.totalCommunications,
    plan_type: outcome.planType,
  };
}

/**
 * Calculate outcome statistics for a set of outcomes
 */
export function calculateOutcomeStats(outcomes: PlanOutcome[]): {
  totalCount: number;
  completedCount: number;
  defaultedCount: number;
  partialCount: number;
  abandonedCount: number;
  avgCollectionRate: number;
  avgOnTimeRate: number;
  avgResolutionDays: number;
} {
  if (outcomes.length === 0) {
    return {
      totalCount: 0,
      completedCount: 0,
      defaultedCount: 0,
      partialCount: 0,
      abandonedCount: 0,
      avgCollectionRate: 0,
      avgOnTimeRate: 0,
      avgResolutionDays: 0,
    };
  }

  const completedCount = outcomes.filter((o) => o.outcomeType === 'COMPLETED').length;
  const defaultedCount = outcomes.filter((o) => o.outcomeType === 'DEFAULTED').length;
  const partialCount = outcomes.filter((o) => o.outcomeType === 'PARTIAL').length;
  const abandonedCount = outcomes.filter((o) => o.outcomeType === 'ABANDONED').length;

  const avgCollectionRate =
    outcomes.reduce((sum, o) => sum + o.collectionRate, 0) / outcomes.length;
  const avgOnTimeRate =
    outcomes.reduce((sum, o) => sum + o.onTimePaymentRate, 0) / outcomes.length;
  const avgResolutionDays =
    outcomes.reduce((sum, o) => sum + o.resolutionDays, 0) / outcomes.length;

  return {
    totalCount: outcomes.length,
    completedCount,
    defaultedCount,
    partialCount,
    abandonedCount,
    avgCollectionRate,
    avgOnTimeRate,
    avgResolutionDays,
  };
}

function generateId(): string {
  return `outcome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
