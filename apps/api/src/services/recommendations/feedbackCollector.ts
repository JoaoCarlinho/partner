/**
 * Feedback Collector Service
 * Tracks recommendation outcomes for continuous improvement
 */

/**
 * Recommendation feedback
 */
export interface RecommendationFeedback {
  id: string;
  recommendationId: string;
  profileId: string;
  recommendationType: string;
  wasAccepted: boolean;
  actualOutcome?: 'resolved' | 'defaulted' | 'ongoing' | 'escalated';
  resolutionDays?: number;
  completionRate?: number;
  userRating?: number; // 1-5
  userComment?: string;
  createdAt: Date;
  outcomeRecordedAt?: Date;
}

/**
 * Accuracy metrics
 */
export interface AccuracyMetrics {
  overall: number;
  byType: Record<string, number>;
  byConfidence: Record<string, number>;
  acceptanceRate: number;
  predictionError: number; // Avg difference between predicted and actual
  trend: Array<{
    date: string;
    accuracy: number;
    sampleSize: number;
  }>;
}

/**
 * Feedback summary for a recommendation
 */
export interface FeedbackSummary {
  totalFeedback: number;
  acceptanceRate: number;
  successRate: number;
  avgCompletionRate: number;
  avgResolutionDays: number;
  avgUserRating: number;
}

/**
 * In-memory store (production would use database)
 */
const feedbackStore = new Map<string, RecommendationFeedback>();
const recommendationPredictions = new Map<string, number>(); // Store original predictions

/**
 * Generate unique ID
 */
function generateId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Record acceptance/rejection of a recommendation
 */
export async function recordAcceptance(
  recommendationId: string,
  profileId: string,
  recommendationType: string,
  wasAccepted: boolean,
  predictedProbability?: number
): Promise<RecommendationFeedback> {
  const feedback: RecommendationFeedback = {
    id: generateId(),
    recommendationId,
    profileId,
    recommendationType,
    wasAccepted,
    createdAt: new Date(),
  };

  feedbackStore.set(feedback.id, feedback);

  // Store prediction for later accuracy calculation
  if (predictedProbability !== undefined) {
    recommendationPredictions.set(recommendationId, predictedProbability);
  }

  return feedback;
}

/**
 * Record the actual outcome of a recommendation
 */
export async function recordOutcome(
  recommendationId: string,
  outcome: RecommendationFeedback['actualOutcome'],
  resolutionDays?: number,
  completionRate?: number
): Promise<RecommendationFeedback | null> {
  // Find feedback for this recommendation
  let targetFeedback: RecommendationFeedback | null = null;
  for (const feedback of feedbackStore.values()) {
    if (feedback.recommendationId === recommendationId) {
      targetFeedback = feedback;
      break;
    }
  }

  if (!targetFeedback) {
    return null;
  }

  // Update with outcome
  targetFeedback.actualOutcome = outcome;
  targetFeedback.resolutionDays = resolutionDays;
  targetFeedback.completionRate = completionRate;
  targetFeedback.outcomeRecordedAt = new Date();

  feedbackStore.set(targetFeedback.id, targetFeedback);

  return targetFeedback;
}

/**
 * Record user rating for a recommendation
 */
export async function recordRating(
  recommendationId: string,
  rating: number,
  comment?: string
): Promise<RecommendationFeedback | null> {
  // Find feedback for this recommendation
  let targetFeedback: RecommendationFeedback | null = null;
  for (const feedback of feedbackStore.values()) {
    if (feedback.recommendationId === recommendationId) {
      targetFeedback = feedback;
      break;
    }
  }

  if (!targetFeedback) {
    return null;
  }

  targetFeedback.userRating = Math.min(5, Math.max(1, rating));
  targetFeedback.userComment = comment;

  feedbackStore.set(targetFeedback.id, targetFeedback);

  return targetFeedback;
}

/**
 * Get feedback for a recommendation
 */
export async function getFeedback(recommendationId: string): Promise<RecommendationFeedback | null> {
  for (const feedback of feedbackStore.values()) {
    if (feedback.recommendationId === recommendationId) {
      return feedback;
    }
  }
  return null;
}

/**
 * Get all feedback for a profile
 */
export async function getProfileFeedback(profileId: string): Promise<RecommendationFeedback[]> {
  const feedback: RecommendationFeedback[] = [];
  for (const fb of feedbackStore.values()) {
    if (fb.profileId === profileId) {
      feedback.push(fb);
    }
  }
  return feedback.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Calculate mean
 */
function mean(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/**
 * Calculate accuracy metrics
 */
export async function calculateAccuracyMetrics(): Promise<AccuracyMetrics> {
  const allFeedback = Array.from(feedbackStore.values());
  const withOutcome = allFeedback.filter((fb) => fb.actualOutcome !== undefined);

  // Calculate overall accuracy
  const successful = withOutcome.filter(
    (fb) => fb.actualOutcome === 'resolved' && (fb.completionRate || 0) >= 0.7
  );
  const overallAccuracy = withOutcome.length > 0 ? successful.length / withOutcome.length : 0;

  // Calculate by type
  const byType: Record<string, number> = {};
  const typeGroups = new Map<string, RecommendationFeedback[]>();
  for (const fb of withOutcome) {
    if (!typeGroups.has(fb.recommendationType)) {
      typeGroups.set(fb.recommendationType, []);
    }
    typeGroups.get(fb.recommendationType)!.push(fb);
  }
  for (const [type, feedbacks] of typeGroups) {
    const typeSuccessful = feedbacks.filter(
      (fb) => fb.actualOutcome === 'resolved' && (fb.completionRate || 0) >= 0.7
    );
    byType[type] = typeSuccessful.length / feedbacks.length;
  }

  // Calculate acceptance rate
  const acceptanceRate = allFeedback.length > 0
    ? allFeedback.filter((fb) => fb.wasAccepted).length / allFeedback.length
    : 0;

  // Calculate prediction error
  let predictionErrors: number[] = [];
  for (const fb of withOutcome) {
    const predicted = recommendationPredictions.get(fb.recommendationId);
    if (predicted !== undefined) {
      const actual = fb.actualOutcome === 'resolved' ? (fb.completionRate || 0.7) : 0;
      predictionErrors.push(Math.abs(predicted - actual));
    }
  }

  // Calculate trend (last 7 days)
  const trend: AccuracyMetrics['trend'] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayFeedback = withOutcome.filter((fb) => {
      const fbDate = fb.outcomeRecordedAt?.toISOString().split('T')[0];
      return fbDate === dateStr;
    });

    const daySuccessful = dayFeedback.filter(
      (fb) => fb.actualOutcome === 'resolved' && (fb.completionRate || 0) >= 0.7
    );

    trend.push({
      date: dateStr,
      accuracy: dayFeedback.length > 0 ? daySuccessful.length / dayFeedback.length : 0,
      sampleSize: dayFeedback.length,
    });
  }

  return {
    overall: Math.round(overallAccuracy * 100) / 100,
    byType: Object.fromEntries(
      Object.entries(byType).map(([k, v]) => [k, Math.round(v * 100) / 100])
    ),
    byConfidence: {}, // Would need confidence stored with feedback
    acceptanceRate: Math.round(acceptanceRate * 100) / 100,
    predictionError: predictionErrors.length > 0 ? mean(predictionErrors) : 0,
    trend,
  };
}

/**
 * Get feedback summary for a recommendation type
 */
export async function getFeedbackSummary(recommendationType?: string): Promise<FeedbackSummary> {
  let feedback = Array.from(feedbackStore.values());

  if (recommendationType) {
    feedback = feedback.filter((fb) => fb.recommendationType === recommendationType);
  }

  const withOutcome = feedback.filter((fb) => fb.actualOutcome !== undefined);
  const successful = withOutcome.filter(
    (fb) => fb.actualOutcome === 'resolved'
  );

  const completionRates = withOutcome
    .filter((fb) => fb.completionRate !== undefined)
    .map((fb) => fb.completionRate!);

  const resolutionDays = successful
    .filter((fb) => fb.resolutionDays !== undefined)
    .map((fb) => fb.resolutionDays!);

  const ratings = feedback
    .filter((fb) => fb.userRating !== undefined)
    .map((fb) => fb.userRating!);

  return {
    totalFeedback: feedback.length,
    acceptanceRate: feedback.length > 0
      ? feedback.filter((fb) => fb.wasAccepted).length / feedback.length
      : 0,
    successRate: withOutcome.length > 0
      ? successful.length / withOutcome.length
      : 0,
    avgCompletionRate: completionRates.length > 0 ? mean(completionRates) : 0,
    avgResolutionDays: resolutionDays.length > 0 ? mean(resolutionDays) : 0,
    avgUserRating: ratings.length > 0 ? mean(ratings) : 0,
  };
}

/**
 * Get recent feedback for model improvement
 */
export async function getRecentFeedback(
  days: number = 30
): Promise<RecommendationFeedback[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const recent: RecommendationFeedback[] = [];
  for (const feedback of feedbackStore.values()) {
    if (feedback.createdAt >= cutoff && feedback.actualOutcome !== undefined) {
      recent.push(feedback);
    }
  }

  return recent.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Export feedback data for analysis
 */
export async function exportFeedbackData(): Promise<{
  feedback: RecommendationFeedback[];
  predictions: Array<{ recommendationId: string; predicted: number }>;
}> {
  const feedback = Array.from(feedbackStore.values());
  const predictions = Array.from(recommendationPredictions.entries()).map(
    ([id, predicted]) => ({ recommendationId: id, predicted })
  );

  return { feedback, predictions };
}

/**
 * Clear all feedback (for testing)
 */
export function clearFeedback(): void {
  feedbackStore.clear();
  recommendationPredictions.clear();
}

export default {
  recordAcceptance,
  recordOutcome,
  recordRating,
  getFeedback,
  getProfileFeedback,
  calculateAccuracyMetrics,
  getFeedbackSummary,
  getRecentFeedback,
  exportFeedbackData,
  clearFeedback,
};
