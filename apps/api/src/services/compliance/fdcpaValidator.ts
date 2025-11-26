import type {
  ValidationContext,
  ComplianceCheckResult,
  ComplianceResult,
} from '@steno/shared';
import {
  FDCPA_REQUIREMENTS,
  MINI_MIRANDA_PATTERNS,
  VALIDATION_NOTICE_PATTERNS,
  DEBT_AMOUNT_PATTERNS,
  isDebtTimeBarred,
  requiresTimeBarredDisclosure,
  getStateRule,
} from '@steno/shared';
import { checkMiniMiranda } from './rules/miniMiranda.js';
import { checkValidationNotice } from './rules/validationNotice.js';
import { checkCreditorId } from './rules/creditorId.js';
import { checkDebtAmount } from './rules/debtAmount.js';
import { checkDisputeRights } from './rules/disputeRights.js';
import { checkTimeBarred } from './rules/timeBarred.js';

/**
 * FDCPA Compliance Validator
 * Validates demand letter content against FDCPA requirements
 */

type RuleValidator = (
  content: string,
  context: ValidationContext
) => ComplianceCheckResult;

/**
 * Registry of all compliance rule validators
 */
const RULE_VALIDATORS: Record<string, RuleValidator> = {
  mini_miranda: checkMiniMiranda,
  validation_notice: checkValidationNotice,
  creditor_identification: checkCreditorId,
  debt_amount: checkDebtAmount,
  dispute_rights: checkDisputeRights,
  time_barred_disclosure: checkTimeBarred,
};

/**
 * Main validation function
 * Runs all applicable rules and returns comprehensive result
 */
export function validateDemandLetter(
  content: string,
  context: ValidationContext
): ComplianceResult {
  const checks: ComplianceCheckResult[] = [];
  const missingRequirements: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Run each registered rule
  for (const requirement of FDCPA_REQUIREMENTS) {
    const validator = RULE_VALIDATORS[requirement.id];

    if (!validator) {
      // Skip rules without validators (may be info-only)
      continue;
    }

    // Check if conditional rule applies
    if (requirement.required === 'conditional') {
      if (requirement.id === 'time_barred_disclosure') {
        // Only check if debt is time-barred and state requires disclosure
        const isTimeBarred = isDebtTimeBarred(
          context.debtDetails.originDate,
          context.state
        );
        const requiresDisclosure = requiresTimeBarredDisclosure(context.state);

        if (!isTimeBarred || !requiresDisclosure) {
          // Add as passed (not applicable)
          checks.push({
            id: requirement.id,
            section: requirement.section,
            name: requirement.name,
            passed: true,
            required: false,
            details: 'Not applicable - debt is not time-barred or state does not require disclosure',
          });
          continue;
        }
      } else if (requirement.id === 'original_creditor') {
        // Only check if original creditor differs from current
        const hasOriginal =
          context.debtDetails.originalCreditor &&
          context.debtDetails.originalCreditor !== context.debtDetails.creditorName;
        if (!hasOriginal) {
          checks.push({
            id: requirement.id,
            section: requirement.section,
            name: requirement.name,
            passed: true,
            required: false,
            details: 'Not applicable - original creditor same as current',
          });
          continue;
        }
      }
    }

    // Run the validation
    const result = validator(content, context);
    checks.push(result);

    // Track failures
    if (!result.passed) {
      if (result.required) {
        missingRequirements.push(result.id);
      } else {
        warnings.push(`${result.name}: ${result.details}`);
      }

      if (result.suggestion) {
        suggestions.push(result.suggestion);
      }
    }
  }

  // Add state-specific warnings
  const stateRule = getStateRule(context.state);
  if (stateRule?.additionalRequirements.length) {
    for (const req of stateRule.additionalRequirements) {
      warnings.push(`State requirement: ${req}`);
    }
  }

  // Calculate compliance score
  const totalRequired = checks.filter((c) => c.required).length;
  const passedRequired = checks.filter((c) => c.required && c.passed).length;
  const totalOptional = checks.filter((c) => !c.required).length;
  const passedOptional = checks.filter((c) => !c.required && c.passed).length;

  // Score: 80% weight on required, 20% on optional
  const requiredScore = totalRequired > 0 ? (passedRequired / totalRequired) * 80 : 80;
  const optionalScore = totalOptional > 0 ? (passedOptional / totalOptional) * 20 : 20;
  const score = Math.round(requiredScore + optionalScore);

  // Compliant only if all required checks pass
  const isCompliant = missingRequirements.length === 0;

  return {
    isCompliant,
    score,
    checks,
    missingRequirements,
    warnings,
    suggestions,
    validatedAt: new Date().toISOString(),
  };
}

/**
 * Quick validation - just returns pass/fail without full details
 */
export function quickValidate(
  content: string,
  context: ValidationContext
): boolean {
  for (const requirement of FDCPA_REQUIREMENTS) {
    if (requirement.required !== true) continue;

    const validator = RULE_VALIDATORS[requirement.id];
    if (!validator) continue;

    const result = validator(content, context);
    if (!result.passed) {
      return false;
    }
  }
  return true;
}

/**
 * Get list of all available rules
 */
export function getAvailableRules() {
  return FDCPA_REQUIREMENTS.map((r) => ({
    id: r.id,
    section: r.section,
    name: r.name,
    description: r.description,
    required: r.required,
  }));
}
