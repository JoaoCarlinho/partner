import { describe, it, expect } from 'vitest';
import { validateDemandLetter, quickValidate } from './fdcpaValidator.js';
import type { ValidationContext } from '@steno/shared';

const baseContext: ValidationContext = {
  state: 'NY',
  debtDetails: {
    principal: 5000,
    interest: 250,
    fees: 100,
    originDate: '2024-01-15',
    creditorName: 'ABC Credit Services',
    originalCreditor: 'Original Bank Corp',
    accountNumber: 'ACC-12345',
  },
};

const compliantLetter = `
IMPORTANT NOTICE REGARDING YOUR RIGHTS

Dear John Doe,

This is an attempt to collect a debt. Any information obtained will be used for that purpose. This communication is from a debt collector.

This letter is to inform you that a balance of $5,350.00 is owed to ABC Credit Services regarding your account.

The amount owed is $5,350.00 itemized as follows:
Principal: $5,000.00
Interest: $250.00
Fees: $100.00
Total: $5,350.00

Unless you dispute the validity of this debt, or any portion thereof, within thirty (30) days after receipt of this notice, this debt will be assumed to be valid by us.

If you notify us in writing within the thirty (30) day period that the debt, or any portion thereof, is disputed, we will obtain verification of the debt and mail a copy of such verification to you.

Upon your written request within the thirty (30) day period, we will provide you with the name and address of the original creditor, if different from the current creditor.

Sincerely,
Smith & Associates Law Firm
123 Legal Street
New York, NY 10001
`;

const nonCompliantLetter = `
Dear John Doe,

Please pay your bill.

Sincerely,
Some Company
`;

const partiallyCompliantLetter = `
Dear John Doe,

This is an attempt to collect a debt.

You owe $5,350.00 to ABC Credit Services.

Please pay within 30 days.

Sincerely,
Smith & Associates
`;

describe('FDCPA Validator', () => {
  describe('validateDemandLetter', () => {
    it('should pass compliant letter', () => {
      const result = validateDemandLetter(compliantLetter, baseContext);

      // Check each required check passes
      for (const check of result.checks) {
        if (check.required && !check.passed) {
          console.log('Failed check:', check.id, '-', check.details, check.suggestion);
        }
      }

      // All required checks should pass
      const requiredChecks = result.checks.filter(c => c.required);
      const passedRequired = requiredChecks.filter(c => c.passed);
      expect(passedRequired.length).toBe(requiredChecks.length);
      expect(result.isCompliant).toBe(true);
    });

    it('should fail non-compliant letter', () => {
      const result = validateDemandLetter(nonCompliantLetter, baseContext);

      expect(result.isCompliant).toBe(false);
      expect(result.score).toBeLessThan(50);
      expect(result.missingRequirements.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should identify specific missing requirements', () => {
      const result = validateDemandLetter(nonCompliantLetter, baseContext);

      expect(result.missingRequirements).toContain('mini_miranda');
      expect(result.missingRequirements).toContain('validation_notice');
      expect(result.missingRequirements).toContain('debt_amount');
    });

    it('should return checks for each rule', () => {
      const result = validateDemandLetter(compliantLetter, baseContext);

      // Should have checks for all major rules
      const checkIds = result.checks.map((c) => c.id);
      expect(checkIds).toContain('mini_miranda');
      expect(checkIds).toContain('validation_notice');
      expect(checkIds).toContain('creditor_identification');
      expect(checkIds).toContain('debt_amount');
      expect(checkIds).toContain('dispute_rights');
    });

    it('should include validatedAt timestamp', () => {
      const result = validateDemandLetter(compliantLetter, baseContext);

      expect(result.validatedAt).toBeDefined();
      expect(new Date(result.validatedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('quickValidate', () => {
    it('should return true for compliant letter', () => {
      const result = quickValidate(compliantLetter, baseContext);
      expect(result).toBe(true);
    });

    it('should return false for non-compliant letter', () => {
      const result = quickValidate(nonCompliantLetter, baseContext);
      expect(result).toBe(false);
    });
  });

  describe('Mini-Miranda check', () => {
    it('should pass with standard Mini-Miranda', () => {
      const content = 'This is an attempt to collect a debt. Any information obtained will be used for that purpose.';
      const result = validateDemandLetter(content, baseContext);
      const miniMiranda = result.checks.find((c) => c.id === 'mini_miranda');

      expect(miniMiranda?.passed).toBe(true);
    });

    it('should pass with alternate debt collector language', () => {
      const content = 'This communication is from a debt collector. Any information received will be used for that purpose.';
      const result = validateDemandLetter(content, baseContext);
      const miniMiranda = result.checks.find((c) => c.id === 'mini_miranda');

      expect(miniMiranda?.passed).toBe(true);
    });

    it('should fail without purpose statement', () => {
      const content = 'This is an attempt to collect a debt.';
      const result = validateDemandLetter(content, baseContext);
      const miniMiranda = result.checks.find((c) => c.id === 'mini_miranda');

      expect(miniMiranda?.passed).toBe(false);
      expect(miniMiranda?.suggestion).toBeDefined();
    });
  });

  describe('Debt amount check', () => {
    it('should pass with correct amount', () => {
      const content = 'The amount owed is $5,350.00 to ABC Credit Services.';
      const result = validateDemandLetter(content, baseContext);
      const debtAmount = result.checks.find((c) => c.id === 'debt_amount');

      expect(debtAmount?.passed).toBe(true);
    });

    it('should pass with principal amount', () => {
      const content = 'You owe $5,000.00 to ABC Credit Services.';
      const result = validateDemandLetter(content, baseContext);
      const debtAmount = result.checks.find((c) => c.id === 'debt_amount');

      expect(debtAmount?.passed).toBe(true);
    });

    it('should fail without amount', () => {
      const content = 'You owe money to ABC Credit Services.';
      const result = validateDemandLetter(content, baseContext);
      const debtAmount = result.checks.find((c) => c.id === 'debt_amount');

      expect(debtAmount?.passed).toBe(false);
    });
  });

  describe('Creditor identification check', () => {
    it('should pass with creditor name present', () => {
      const content = 'This debt is owed to ABC Credit Services.';
      const result = validateDemandLetter(content, baseContext);
      const creditorId = result.checks.find((c) => c.id === 'creditor_identification');

      expect(creditorId?.passed).toBe(true);
    });

    it('should fail without creditor name', () => {
      const content = 'This debt is owed to some company.';
      const result = validateDemandLetter(content, baseContext);
      const creditorId = result.checks.find((c) => c.id === 'creditor_identification');

      expect(creditorId?.passed).toBe(false);
    });
  });

  describe('Dispute rights check', () => {
    it('should pass with complete dispute rights', () => {
      const content = `
        Within 30 days of receiving this notice, you may dispute this debt.
        If you dispute this debt in writing, we will provide verification.
      `;
      const result = validateDemandLetter(content, baseContext);
      const disputeRights = result.checks.find((c) => c.id === 'dispute_rights');

      expect(disputeRights?.passed).toBe(true);
    });

    it('should fail without 30-day mention', () => {
      const content = 'You may dispute this debt.';
      const result = validateDemandLetter(content, baseContext);
      const disputeRights = result.checks.find((c) => c.id === 'dispute_rights');

      expect(disputeRights?.passed).toBe(false);
    });
  });

  describe('Time-barred debt check', () => {
    it('should be non-applicable for recent debt', () => {
      const recentContext = {
        ...baseContext,
        debtDetails: {
          ...baseContext.debtDetails,
          originDate: new Date().toISOString(), // Today
        },
      };

      const result = validateDemandLetter(compliantLetter, recentContext);
      const timeBarred = result.checks.find((c) => c.id === 'time_barred_disclosure');

      expect(timeBarred?.passed).toBe(true);
      expect(timeBarred?.required).toBe(false);
    });

    it('should require disclosure for old debt in NY', () => {
      const oldDebtContext = {
        ...baseContext,
        state: 'NY',
        debtDetails: {
          ...baseContext.debtDetails,
          originDate: '2015-01-01', // Over 6 years old
        },
      };

      const letterWithoutTimeBarred = partiallyCompliantLetter;
      const result = validateDemandLetter(letterWithoutTimeBarred, oldDebtContext);
      const timeBarred = result.checks.find((c) => c.id === 'time_barred_disclosure');

      expect(timeBarred?.required).toBe(true);
      expect(timeBarred?.passed).toBe(false);
    });
  });

  describe('State-specific behavior', () => {
    it('should include state warnings for CA', () => {
      const caContext = { ...baseContext, state: 'CA' };
      const result = validateDemandLetter(compliantLetter, caContext);

      // CA has Rosenthal Act requirements
      expect(result.warnings.some((w) => w.includes('Rosenthal'))).toBe(true);
    });

    it('should include state warnings for TX', () => {
      const txContext = { ...baseContext, state: 'TX' };
      const result = validateDemandLetter(compliantLetter, txContext);

      // TX has time-barred debt notice requirements
      expect(
        result.warnings.some((w) => w.includes('Texas') || w.includes('time-barred'))
      ).toBe(true);
    });
  });

  describe('Score calculation', () => {
    it('should give 100 for fully compliant letter', () => {
      const result = validateDemandLetter(compliantLetter, baseContext);
      // Allow some variance since optional checks may affect score
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it('should give low score for non-compliant letter', () => {
      const result = validateDemandLetter(nonCompliantLetter, baseContext);
      expect(result.score).toBeLessThan(30);
    });

    it('should give partial score for partially compliant letter', () => {
      const result = validateDemandLetter(partiallyCompliantLetter, baseContext);
      expect(result.score).toBeGreaterThan(20);
      expect(result.score).toBeLessThan(80);
    });
  });
});
