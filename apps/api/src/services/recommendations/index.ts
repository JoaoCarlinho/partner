/**
 * Recommendations Service Module
 */

// Recommendation Engine
export {
  generateRecommendations,
  calculateSuccessProbability,
} from './recommendationEngine';

export type {
  RecommendationType,
  PlanRecommendation,
  CommunicationRecommendation,
  TimingRecommendation,
  EscalationRecommendation,
  SuccessFactor,
  SuccessPrediction,
  Recommendation,
  RecommendationSet,
  ProfileContext,
  SimilarProfileSummary,
} from './recommendationEngine';

// A/B Testing Service
export {
  createTest,
  getActiveTests,
  getTest,
  getTestByName,
  assignVariant,
  getAssignment,
  recordResult,
  getTestResults,
  completeTest,
  pauseTest,
  getAllTestsWithResults,
  initializeDefaultTests,
} from './abTestingService';

export type {
  ABTest,
  ABTestAssignment,
  ABTestResult,
  AggregatedTestResults,
} from './abTestingService';

// Feedback Collector
export {
  recordAcceptance,
  recordOutcome,
  recordRating,
  getFeedback,
  getProfileFeedback,
  calculateAccuracyMetrics,
  getFeedbackSummary,
  getRecentFeedback,
  exportFeedbackData,
} from './feedbackCollector';

export type {
  RecommendationFeedback,
  AccuracyMetrics,
  FeedbackSummary,
} from './feedbackCollector';
