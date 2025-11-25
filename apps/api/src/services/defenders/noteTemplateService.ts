/**
 * Note Template Service
 * Provides default and custom templates for defender case notes
 */

import { v4 as uuidv4 } from 'uuid';
import { NoteCategory } from './noteService';

export interface NoteTemplate {
  id: string;
  defenderId?: string;
  name: string;
  category: NoteCategory;
  content: string;
  isSystem: boolean;
  createdAt: Date;
}

// In-memory store for development
// Note: In production, use PostgreSQL/Prisma
const templateStore = new Map<string, NoteTemplate>();

// Default system templates
const DEFAULT_TEMPLATES: Omit<NoteTemplate, 'id' | 'createdAt'>[] = [
  {
    name: 'Initial Assessment',
    category: 'INITIAL_ASSESSMENT',
    isSystem: true,
    content: `## Initial Case Assessment

**Date:** [Today's Date]
**Debtor:** [Name]

### Case Overview
- Debt Amount: $
- Creditor:
- Debt Age:
- Debt Type:

### Initial Observations
-

### Debtor's Concerns
-

### Debtor's Financial Situation
- Employment Status:
- Monthly Income:
- Monthly Obligations:

### Immediate Priorities
1.
2.
3.

### Next Steps
- [ ] Review debt documentation
- [ ] Verify debt validity
- [ ] Assess negotiation options
- [ ] Schedule follow-up

### Notes for Follow-up
-
`,
  },
  {
    name: 'Financial Review',
    category: 'FINANCIAL_GUIDANCE',
    isSystem: true,
    content: `## Financial Review Notes

**Date:** [Today's Date]

### Income Assessment
- Monthly Income: $
- Income Type: (salary/hourly/self-employed/benefits)
- Income Stability: (stable/unstable/seasonal)
- Other Income Sources:

### Expense Analysis
| Category | Amount |
|----------|--------|
| Housing | $ |
| Utilities | $ |
| Food | $ |
| Transportation | $ |
| Healthcare | $ |
| Insurance | $ |
| Other Debts | $ |
| **Total Essential** | $ |

- Discretionary Spending: $
- Available for Debt Payment: $

### Affordability Calculation
- Monthly Income: $
- Total Expenses: $
- **Net Available:** $

### Recommendations
-

### Discussion Points for Debtor
-

### Action Items
- [ ]
`,
  },
  {
    name: 'Plan Discussion',
    category: 'PLAN_RECOMMENDATIONS',
    isSystem: true,
    content: `## Payment Plan Discussion

**Date:** [Today's Date]

### Current Plan Status
- Plan Type:
- Monthly Amount: $
- Duration:
- Total to be Paid: $
- Start Date:

### Plan Analysis
- Is the plan affordable? (Yes/No)
- Risk factors:
- Likelihood of completion:

### Alternative Options Discussed
1. **Option A:**
   - Monthly: $
   - Duration:
   - Pros:
   - Cons:

2. **Option B:**
   - Monthly: $
   - Duration:
   - Pros:
   - Cons:

### Debtor's Preference
-

### My Recommendation
-

### Action Items
- [ ]
`,
  },
  {
    name: 'Follow-up Checklist',
    category: 'FOLLOW_UP_REQUIRED',
    isSystem: true,
    content: `## Follow-up Required

**Date:** [Today's Date]
**Follow-up By:** [Date]
**Priority:** (High/Medium/Low)

### Pending Items
- [ ]
- [ ]
- [ ]

### Waiting On
| Item | From | Expected By |
|------|------|-------------|
| | | |

### Reminders
- [ ] Check creditor response
- [ ] Verify payment processing
- [ ] Contact debtor for update

### Questions to Ask
-

### Documents Needed
- [ ]

### Notes
-
`,
  },
  {
    name: 'Communication Coaching',
    category: 'COMMUNICATION_COACHING',
    isSystem: true,
    content: `## Communication Coaching Notes

**Date:** [Today's Date]

### Current Communication Style
- How debtor typically responds to creditor:
- Identified issues:

### Coaching Points Discussed
1. **Know Your Rights:**
   - FDCPA protections
   - What collectors can/cannot do
   - How to respond to violations

2. **Communication Best Practices:**
   - Always communicate in writing when possible
   - Keep copies of all correspondence
   - Stay calm and professional
   - Don't make promises you can't keep

3. **Phrases to Use:**
   - "I am requesting validation of this debt"
   - "Please communicate with me in writing"
   - "I am working on a payment arrangement"

4. **Phrases to Avoid:**
   - Don't admit to owing the debt without verification
   - Don't provide bank account information over phone
   - Don't agree to unrealistic payment terms

### Practice Scenarios
-

### Debtor's Questions
-

### Follow-up
- [ ] Send communication templates
- [ ] Review sample letters
`,
  },
  {
    name: 'Resolution Summary',
    category: 'CASE_RESOLUTION',
    isSystem: true,
    content: `## Case Resolution Summary

**Date:** [Today's Date]
**Case Duration:** [Start Date] to [End Date]

### Resolution Type
- [ ] Plan Completed Successfully
- [ ] Settlement Reached
- [ ] Debt Disputed and Removed
- [ ] Statute of Limitations Applied
- [ ] Bankruptcy Filed
- [ ] Other:

### Final Outcome
- Original Debt: $
- Final Amount Paid: $
- Savings Achieved: $ (%)
- Duration:

### Key Factors in Resolution
-

### What Worked Well
-

### Challenges Encountered
-

### Lessons Learned
-

### Debtor Feedback
- Satisfaction Level: (1-10)
- Comments:

### Recommendations for Similar Cases
-

### Case Closure Checklist
- [ ] Verify debt marked as satisfied
- [ ] Confirm credit report update
- [ ] Provide debtor with closure documentation
- [ ] Archive case files
`,
  },
  {
    name: 'General Note',
    category: 'GENERAL',
    isSystem: true,
    content: `## Case Note

**Date:** [Today's Date]

### Summary
-

### Details
-

### Action Items
- [ ]

### Follow-up Date
-
`,
  },
];

// Initialize default templates
function initializeDefaultTemplates() {
  DEFAULT_TEMPLATES.forEach((template) => {
    const id = uuidv4();
    templateStore.set(id, {
      ...template,
      id,
      createdAt: new Date(),
    });
  });
}

// Initialize on module load
initializeDefaultTemplates();

export class NoteTemplateService {
  /**
   * Get all available templates for a defender
   * Returns system templates + custom templates created by the defender
   */
  async getTemplates(defenderId?: string): Promise<NoteTemplate[]> {
    const templates = Array.from(templateStore.values());

    return templates
      .filter((t) => t.isSystem || t.defenderId === defenderId)
      .sort((a, b) => {
        // System templates first, then by name
        if (a.isSystem !== b.isSystem) {
          return a.isSystem ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(
    category: NoteCategory,
    defenderId?: string
  ): Promise<NoteTemplate[]> {
    const templates = await this.getTemplates(defenderId);
    return templates.filter((t) => t.category === category);
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(
    templateId: string,
    defenderId?: string
  ): Promise<NoteTemplate | null> {
    const template = templateStore.get(templateId);

    if (!template) {
      return null;
    }

    // Check access
    if (!template.isSystem && template.defenderId !== defenderId) {
      return null;
    }

    return template;
  }

  /**
   * Save a custom template
   */
  async saveCustomTemplate(
    defenderId: string,
    name: string,
    category: NoteCategory,
    content: string
  ): Promise<NoteTemplate> {
    const id = uuidv4();
    const template: NoteTemplate = {
      id,
      defenderId,
      name,
      category,
      content,
      isSystem: false,
      createdAt: new Date(),
    };

    templateStore.set(id, template);

    return template;
  }

  /**
   * Update a custom template
   */
  async updateCustomTemplate(
    templateId: string,
    defenderId: string,
    updates: { name?: string; category?: NoteCategory; content?: string }
  ): Promise<NoteTemplate> {
    const template = templateStore.get(templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    if (template.isSystem) {
      throw new Error('Cannot edit system templates');
    }

    if (template.defenderId !== defenderId) {
      throw new Error('Cannot edit another defender\'s template');
    }

    if (updates.name) template.name = updates.name;
    if (updates.category) template.category = updates.category;
    if (updates.content) template.content = updates.content;

    templateStore.set(templateId, template);

    return template;
  }

  /**
   * Delete a custom template
   */
  async deleteCustomTemplate(
    templateId: string,
    defenderId: string
  ): Promise<void> {
    const template = templateStore.get(templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    if (template.isSystem) {
      throw new Error('Cannot delete system templates');
    }

    if (template.defenderId !== defenderId) {
      throw new Error('Cannot delete another defender\'s template');
    }

    templateStore.delete(templateId);
  }

  /**
   * Clone a template (system or custom) as a new custom template
   */
  async cloneTemplate(
    templateId: string,
    defenderId: string,
    newName: string
  ): Promise<NoteTemplate> {
    const original = templateStore.get(templateId);

    if (!original) {
      throw new Error('Template not found');
    }

    return this.saveCustomTemplate(
      defenderId,
      newName,
      original.category,
      original.content
    );
  }

  /**
   * Get template usage statistics for a defender
   */
  async getTemplateStats(defenderId: string): Promise<{
    totalCustomTemplates: number;
    templatesByCategory: Record<NoteCategory, number>;
  }> {
    const templates = Array.from(templateStore.values()).filter(
      (t) => t.defenderId === defenderId
    );

    const templatesByCategory: Record<NoteCategory, number> = {
      INITIAL_ASSESSMENT: 0,
      FINANCIAL_GUIDANCE: 0,
      COMMUNICATION_COACHING: 0,
      PLAN_RECOMMENDATIONS: 0,
      FOLLOW_UP_REQUIRED: 0,
      CASE_RESOLUTION: 0,
      GENERAL: 0,
    };

    templates.forEach((t) => {
      templatesByCategory[t.category]++;
    });

    return {
      totalCustomTemplates: templates.length,
      templatesByCategory,
    };
  }
}

// Export singleton instance
export const noteTemplateService = new NoteTemplateService();
