import { describe, it, expect } from 'vitest';
import {
  TEMPLATE_VARIABLES,
  REQUIRED_FDCPA_VARIABLES,
  extractVariables,
  validateFdcpaVariables,
  isValidVariable,
  getUnknownVariables,
  renderTemplate,
  getSampleData,
} from './templateVariables.js';

describe('Template Variables', () => {
  describe('TEMPLATE_VARIABLES', () => {
    it('should have all required FDCPA variables defined', () => {
      for (const variable of REQUIRED_FDCPA_VARIABLES) {
        expect(TEMPLATE_VARIABLES[variable]).toBeDefined();
        expect(TEMPLATE_VARIABLES[variable].required).toBe(true);
      }
    });

    it('should have required flag correctly set', () => {
      expect(TEMPLATE_VARIABLES.debtor_name.required).toBe(true);
      expect(TEMPLATE_VARIABLES.firm_phone.required).toBe(false);
      expect(TEMPLATE_VARIABLES.response_deadline.required).toBe(false);
    });
  });

  describe('extractVariables', () => {
    it('should extract single variable', () => {
      const content = 'Dear {{debtor_name}},';
      const variables = extractVariables(content);
      expect(variables).toEqual(['debtor_name']);
    });

    it('should extract multiple variables', () => {
      const content = 'Dear {{debtor_name}}, you owe {{debt_amount}} to {{creditor_name}}.';
      const variables = extractVariables(content);
      expect(variables).toContain('debtor_name');
      expect(variables).toContain('debt_amount');
      expect(variables).toContain('creditor_name');
      expect(variables.length).toBe(3);
    });

    it('should deduplicate repeated variables', () => {
      const content = '{{debtor_name}} owes money. Dear {{debtor_name}},';
      const variables = extractVariables(content);
      expect(variables).toEqual(['debtor_name']);
    });

    it('should return empty array for no variables', () => {
      const content = 'This is plain text.';
      const variables = extractVariables(content);
      expect(variables).toEqual([]);
    });

    it('should ignore malformed variables', () => {
      const content = '{{debtor_name}} {{ invalid }} {not_valid} {{123}}';
      const variables = extractVariables(content);
      expect(variables).toEqual(['debtor_name']);
    });
  });

  describe('validateFdcpaVariables', () => {
    it('should validate template with all required variables', () => {
      const content = `
        Dear {{debtor_name}},
        You owe {{debt_amount}} to {{creditor_name}}.
        You have until {{validation_deadline}} to respond.
        Contact {{firm_name}} at {{firm_address}}.
      `;
      const result = validateFdcpaVariables(content);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should identify missing required variables', () => {
      const content = 'Dear {{debtor_name}}, you owe {{debt_amount}}.';
      const result = validateFdcpaVariables(content);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('creditor_name');
      expect(result.missing).toContain('validation_deadline');
      expect(result.missing).toContain('firm_name');
      expect(result.missing).toContain('firm_address');
    });

    it('should allow extra non-required variables', () => {
      const content = `
        Dear {{debtor_name}},
        You owe {{debt_amount}} to {{creditor_name}}.
        Account: {{account_number}}
        Deadline: {{validation_deadline}}
        Contact {{firm_name}} at {{firm_address}}, {{firm_phone}}.
      `;
      const result = validateFdcpaVariables(content);
      expect(result.valid).toBe(true);
    });
  });

  describe('isValidVariable', () => {
    it('should return true for known variables', () => {
      expect(isValidVariable('debtor_name')).toBe(true);
      expect(isValidVariable('debt_amount')).toBe(true);
      expect(isValidVariable('firm_phone')).toBe(true);
    });

    it('should return false for unknown variables', () => {
      expect(isValidVariable('unknown_var')).toBe(false);
      expect(isValidVariable('random_thing')).toBe(false);
    });
  });

  describe('getUnknownVariables', () => {
    it('should return empty for all known variables', () => {
      const content = '{{debtor_name}} {{creditor_name}} {{debt_amount}}';
      const unknown = getUnknownVariables(content);
      expect(unknown).toEqual([]);
    });

    it('should identify unknown variables', () => {
      const content = '{{debtor_name}} {{custom_field}} {{another_unknown}}';
      const unknown = getUnknownVariables(content);
      expect(unknown).toContain('custom_field');
      expect(unknown).toContain('another_unknown');
      expect(unknown.length).toBe(2);
    });
  });

  describe('renderTemplate', () => {
    it('should replace all variables with values', () => {
      const content = 'Dear {{debtor_name}}, you owe {{debt_amount}}.';
      const values = {
        debtor_name: 'John Doe',
        debt_amount: '$5,000.00',
      };
      const result = renderTemplate(content, values);
      expect(result.rendered).toBe('Dear John Doe, you owe $5,000.00.');
      expect(result.missing).toEqual([]);
    });

    it('should report missing variables', () => {
      const content = 'Dear {{debtor_name}}, you owe {{debt_amount}}.';
      const values = {
        debtor_name: 'John Doe',
      };
      const result = renderTemplate(content, values);
      expect(result.rendered).toBe('Dear John Doe, you owe {{debt_amount}}.');
      expect(result.missing).toEqual(['debt_amount']);
    });

    it('should replace multiple occurrences of same variable', () => {
      const content = '{{debtor_name}} owes money. Contact {{debtor_name}} today.';
      const values = { debtor_name: 'Jane Smith' };
      const result = renderTemplate(content, values);
      expect(result.rendered).toBe('Jane Smith owes money. Contact Jane Smith today.');
    });

    it('should ignore extra values not in template', () => {
      const content = 'Dear {{debtor_name}}.';
      const values = {
        debtor_name: 'John',
        extra_field: 'ignored',
      };
      const result = renderTemplate(content, values);
      expect(result.rendered).toBe('Dear John.');
      expect(result.missing).toEqual([]);
    });
  });

  describe('getSampleData', () => {
    it('should return sample data for all defined variables', () => {
      const sample = getSampleData();

      // Check it has all defined variables
      for (const key of Object.keys(TEMPLATE_VARIABLES)) {
        expect(sample[key]).toBeDefined();
        expect(sample[key]).toBe(TEMPLATE_VARIABLES[key].example);
      }
    });

    it('should return valid string values', () => {
      const sample = getSampleData();

      for (const value of Object.values(sample)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });
  });
});
