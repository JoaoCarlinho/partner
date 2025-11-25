/**
 * Learning Pipeline Service Module
 * Closes the learning loop by capturing outcomes and feeding them back
 * into the embedding and recommendation systems
 */

// Outcome Capture
export {
  captureOutcome,
  determineOutcomeType,
  hasConsecutiveMissed,
  getOutcome,
  getOutcomeByPlanId,
  getProfileOutcomes,
  getOutcomesByDateRange,
  getPendingEvents,
  clearProcessedEvents,
  createOutcomeSnapshot,
  calculateOutcomeStats,
} from './outcomeCapture';

export type {
  OutcomeType,
  PlanOutcome,
  ScheduledPayment,
  PaymentPlan,
  LearningEvent,
} from './outcomeCapture';

// Embedding Updater
export {
  updateEmbeddingWithOutcome,
  prepareProfileDescriptionWithOutcome,
  getProfileEmbedding,
  upsertProfileEmbedding,
  batchUpdateEmbeddings,
  getEmbeddingUpdates,
  getEmbeddingsWithoutOutcome,
  compareVersions,
  EMBEDDING_MODEL_VERSION,
} from './embeddingUpdater';

export type {
  ProfileEmbedding,
  ProfileSnapshot,
  EmbeddingUpdate,
  DebtorProfile,
} from './embeddingUpdater';

// Performance Tracker
export {
  calculateDailyMetrics,
  getMetricsByDateRange,
  getRecentMetrics,
  getMetricsSummary,
  getAlerts,
  acknowledgeAlert,
  shouldTriggerRetraining,
  calculateAggregateStats,
} from './performanceTracker';

export type {
  ModelMetrics,
  PerformanceAlert,
  RecommendationRecord,
  MetricsSummary,
} from './performanceTracker';

// Retraining Pipeline
export {
  checkRetrainingNeeded,
  triggerRetraining,
  getRetrainingRun,
  getLastSuccessfulRun,
  getRunningRun,
  getRetrainingRuns,
  cancelRetraining,
  getRetrainingConfig,
  updateRetrainingConfig,
  getRetrainingStats,
  scheduledRetrainingCheck,
} from './retrainingPipeline';

export type {
  RetrainingStatus,
  TriggerReason,
  RetrainingRun,
  RetrainingConfig,
} from './retrainingPipeline';

// A/B Test Analyzer
export {
  analyzeABTest,
  calculateCohensH,
  interpretEffectSize,
  integrateWinningVariant,
  getSystemConfig,
  getAllSystemConfigs,
  getTestAnalysis,
  getAllTestAnalyses,
  calculateRequiredSampleSize,
  generateTestSummary,
} from './abTestAnalyzer';

export type {
  ABTestVariantMetrics,
  ABTestAnalysis,
  ABTestRecord,
  ABTestResultRecord,
  SystemConfig,
} from './abTestAnalyzer';

// Bias Detector
export {
  detectBias,
  mitigateBias,
  getSegmentConfig,
  getAllSegmentConfigs,
  getBiasAuditHistory,
  generateBiasReport,
  calculateFairnessMetrics,
} from './biasDetector';

export type {
  BiasMetrics,
  BiasAuditLog,
  MitigationDetails,
  SegmentConfig,
  OutcomeRecord,
} from './biasDetector';
