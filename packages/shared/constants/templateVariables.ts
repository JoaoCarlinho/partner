/**
 * Template variable definitions for demand letter templates
 * Variables use {{variable_name}} syntax
 */

export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  example: string;
}

/**
 * All supported template variables
 */
export const TEMPLATE_VARIABLES: Record<string, TemplateVariable> = {
  debtor_name: {
    name: 'debtor_name',
    description: 'Full name of the debtor',
    required: true,
    example: 'John Doe',
  },
  creditor_name: {
    name: 'creditor_name',
    description: 'Original creditor name',
    required: true,
    example: 'ABC Credit Services',
  },
  debt_amount: {
    name: 'debt_amount',
    description: 'Total amount owed',
    required: true,
    example: '$5,000.00',
  },
  debt_origin_date: {
    name: 'debt_origin_date',
    description: 'When the debt was incurred',
    required: true,
    example: 'January 15, 2024',
  },
  validation_deadline: {
    name: 'validation_deadline',
    description: '30-day validation deadline per FDCPA',
    required: true,
    example: 'December 25, 2024',
  },
  response_deadline: {
    name: 'response_deadline',
    description: 'Response due date',
    required: false,
    example: 'December 30, 2024',
  },
  platform_invitation_link: {
    name: 'platform_invitation_link',
    description: 'Unique link for debtor to join the platform',
    required: true,
    example: 'https://app.steno.com/invite/abc123',
  },
  firm_name: {
    name: 'firm_name',
    description: 'Law firm name',
    required: true,
    example: 'Smith & Associates, PLLC',
  },
  firm_address: {
    name: 'firm_address',
    description: 'Law firm mailing address',
    required: true,
    example: '123 Legal Street, Suite 100, New York, NY 10001',
  },
  firm_phone: {
    name: 'firm_phone',
    description: 'Law firm phone number',
    required: false,
    example: '(555) 123-4567',
  },
  account_number: {
    name: 'account_number',
    description: 'Debtor account reference number',
    required: false,
    example: 'ACC-2024-001234',
  },
  current_date: {
    name: 'current_date',
    description: 'Current date when letter is generated',
    required: false,
    example: 'November 25, 2024',
  },
};

/**
 * Required FDCPA variables that must be present in all demand letters
 */
export const REQUIRED_FDCPA_VARIABLES = [
  'debtor_name',
  'creditor_name',
  'debt_amount',
  'validation_deadline',
  'firm_name',
  'firm_address',
] as const;

/**
 * Variable pattern for extracting variables from template content
 */
export const VARIABLE_PATTERN = /\{\{([a-z_]+)\}\}/g;

/**
 * Extract all variable names from template content
 */
export function extractVariables(content: string): string[] {
  const matches = content.matchAll(VARIABLE_PATTERN);
  const variables = new Set<string>();
  for (const match of matches) {
    variables.add(match[1]);
  }
  return Array.from(variables);
}

/**
 * Validate that content contains all required FDCPA variables
 */
export function validateFdcpaVariables(content: string): {
  valid: boolean;
  missing: string[];
} {
  const extracted = extractVariables(content);
  const missing = REQUIRED_FDCPA_VARIABLES.filter(
    (v) => !extracted.includes(v)
  );
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Check if a variable name is a known template variable
 */
export function isValidVariable(name: string): boolean {
  return name in TEMPLATE_VARIABLES;
}

/**
 * Get unknown variables from content (not in our defined set)
 */
export function getUnknownVariables(content: string): string[] {
  const extracted = extractVariables(content);
  return extracted.filter((v) => !isValidVariable(v));
}

/**
 * Replace variables in template content with provided values
 */
export function renderTemplate(
  content: string,
  values: Record<string, string>
): { rendered: string; missing: string[] } {
  const extracted = extractVariables(content);
  const missing: string[] = [];

  let rendered = content;
  for (const variable of extracted) {
    const value = values[variable];
    if (value !== undefined) {
      rendered = rendered.replace(
        new RegExp(`\\{\\{${variable}\\}\\}`, 'g'),
        value
      );
    } else {
      missing.push(variable);
    }
  }

  return { rendered, missing };
}

/**
 * Generate sample data for preview using example values
 */
export function getSampleData(): Record<string, string> {
  const sample: Record<string, string> = {};
  for (const [key, variable] of Object.entries(TEMPLATE_VARIABLES)) {
    sample[key] = variable.example;
  }
  return sample;
}
