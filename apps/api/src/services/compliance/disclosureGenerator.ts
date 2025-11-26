import type { DisclosureBlock, ValidationContext } from '@steno/shared';
import { getStateRule, isDebtTimeBarred } from '@steno/shared';

/**
 * Disclosure Generator
 * Generates required FDCPA disclosure blocks for templates
 */

/**
 * Generate Mini-Miranda disclosure block
 */
export function generateMiniMiranda(): DisclosureBlock {
  return {
    id: 'mini_miranda',
    name: 'Mini-Miranda Warning',
    section: '15 U.S.C. § 1692e(11)',
    required: true,
    content: `This is an attempt to collect a debt. Any information obtained will be used for that purpose. This communication is from a debt collector.`,
  };
}

/**
 * Generate validation notice disclosure block
 */
export function generateValidationNotice(): DisclosureBlock {
  return {
    id: 'validation_notice',
    name: 'Debt Validation Notice',
    section: '12 CFR § 1006.34',
    required: true,
    content: `IMPORTANT NOTICE REGARDING YOUR RIGHTS

Unless you dispute the validity of this debt, or any portion thereof, within thirty (30) days after receipt of this notice, this debt will be assumed to be valid by us. If you notify us in writing within the thirty (30) day period that the debt, or any portion thereof, is disputed, we will obtain verification of the debt or a copy of a judgment against you and mail a copy of such verification or judgment to you. Upon your written request within the thirty (30) day period, we will provide you with the name and address of the original creditor, if different from the current creditor.`,
  };
}

/**
 * Generate dispute rights disclosure block
 */
export function generateDisputeRights(): DisclosureBlock {
  return {
    id: 'dispute_rights',
    name: 'Dispute Rights',
    section: '15 U.S.C. § 1692g(a)(3-5)',
    required: true,
    content: `YOUR RIGHTS UNDER FEDERAL LAW

You have the right to dispute this debt. Within 30 days of receiving this notice:

• If you dispute the debt in writing, we will provide verification of the debt.
• If you request in writing, we will provide the name and address of the original creditor if different from the current creditor.
• If you do not dispute this debt within 30 days, we will assume the debt is valid.

To dispute this debt or request verification, send your written request to the address above.`,
  };
}

/**
 * Generate time-barred debt disclosure for specific state
 */
export function generateTimeBarredDisclosure(
  state: string
): DisclosureBlock | null {
  const stateRule = getStateRule(state);

  if (!stateRule) {
    // Generic disclosure
    return {
      id: 'time_barred',
      name: 'Time-Barred Debt Disclosure',
      section: 'State-specific',
      required: false,
      content: `The law limits how long you can be sued on a debt. Because of the age of your debt, we will not sue you for it. If you make a payment on this debt, the debt may become enforceable against you.`,
    };
  }

  // State-specific disclosure
  const stateDisclosure = stateRule.additionalDisclosures?.[0];

  return {
    id: 'time_barred',
    name: `Time-Barred Debt Disclosure (${state})`,
    section: 'State-specific',
    required: stateRule.timeBarredDisclosureRequired,
    content:
      stateDisclosure ||
      `The law limits how long you can be sued on a debt. Because of the age of your debt, we will not sue you for it.`,
  };
}

/**
 * Generate creditor identification block
 */
export function generateCreditorBlock(
  creditorName: string,
  originalCreditor?: string
): DisclosureBlock {
  let content = `This debt is owed to ${creditorName}.`;

  if (originalCreditor && originalCreditor !== creditorName) {
    content += ` The original creditor was ${originalCreditor}.`;
  }

  return {
    id: 'creditor_id',
    name: 'Creditor Identification',
    section: '15 U.S.C. § 1692g(a)(2)',
    required: true,
    content,
  };
}

/**
 * Generate debt amount block
 */
export function generateDebtAmountBlock(
  principal: number,
  interest?: number,
  fees?: number
): DisclosureBlock {
  const total = principal + (interest || 0) + (fees || 0);
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  let content = `The amount owed is ${formatter.format(total)}.`;

  // Add itemization if there are additional charges
  if (interest || fees) {
    const items: string[] = [`Principal: ${formatter.format(principal)}`];
    if (interest) items.push(`Interest: ${formatter.format(interest)}`);
    if (fees) items.push(`Fees: ${formatter.format(fees)}`);
    items.push(`Total: ${formatter.format(total)}`);

    content += `\n\nItemized breakdown:\n${items.join('\n')}`;
  }

  return {
    id: 'debt_amount',
    name: 'Debt Amount Statement',
    section: '15 U.S.C. § 1692g(a)(1)',
    required: true,
    content,
  };
}

/**
 * Get all required disclosure blocks for a context
 */
export function getRequiredDisclosures(
  context: ValidationContext
): DisclosureBlock[] {
  const blocks: DisclosureBlock[] = [
    generateMiniMiranda(),
    generateValidationNotice(),
    generateDisputeRights(),
    generateCreditorBlock(
      context.debtDetails.creditorName,
      context.debtDetails.originalCreditor
    ),
    generateDebtAmountBlock(
      context.debtDetails.principal,
      context.debtDetails.interest,
      context.debtDetails.fees
    ),
  ];

  // Add time-barred disclosure if applicable
  const timeBarred = isDebtTimeBarred(
    context.debtDetails.originDate,
    context.state
  );

  if (timeBarred) {
    const timeBarredBlock = generateTimeBarredDisclosure(context.state);
    if (timeBarredBlock) {
      blocks.push(timeBarredBlock);
    }
  }

  return blocks;
}

/**
 * Generate complete disclosure section for a demand letter
 */
export function generateCompleteDisclosure(
  context: ValidationContext
): string {
  const blocks = getRequiredDisclosures(context);

  return blocks.map((block) => block.content).join('\n\n---\n\n');
}
