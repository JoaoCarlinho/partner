/**
 * Plans Service Module
 * Payment plan calculation and management
 */

export {
  Frequency,
  PlanStatus,
  PaymentStatus,
  PlanInput,
  ScheduledPayment,
  PlanCalculation,
  addIntervals,
  calculatePlanDetails,
  generatePaymentSchedule,
  normalizeToMonthly,
  getFrequencyDays,
  suggestPaymentAmount,
  validatePlanInput,
} from './planCalculator';

export {
  FinancialAssessment,
  AffordabilityResult,
  calculateAffordability,
  getAffordabilityThresholds,
  suggestAffordablePayment,
} from './affordabilityCalculator';
