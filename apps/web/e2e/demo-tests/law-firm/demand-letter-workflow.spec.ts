/**
 * Demand Letter Workflow Demo Test
 *
 * This test demonstrates the full demand letter creation workflow:
 * 1. Login as paralegal
 * 2. Create a new case with debtor information
 * 3. Draft an initial (aggressive) demand letter
 * 4. AI assistant guides refinement to professional, warm tone
 * 5. Emphasize avoiding litigation and Partner app benefits
 * 6. Submit for attorney approval
 * 7. Send letter to debtor
 *
 * Video output demonstrates AI-guided letter refinement for documentation.
 */

import { test, expect } from '../../fixtures/demo.fixture';
import {
  pauseForReading,
  smoothClick,
  fillFieldSlowly,
  navigateWithPause,
  smoothScrollTo,
  typeSlowly,
  waitForModal,
  closeModal,
} from '../../utils/demo-helpers';

// ============================================
// CONFIGURABLE TEST VALUES
// ============================================

const TEST_CONFIG = {
  // Login credentials (using TestPassword123! from seed data)
  paralegalEmail: process.env.PARALEGAL_EMAIL || 'paralegal@lawfirm.com',
  paralegalPassword: process.env.PARALEGAL_PASSWORD || 'TestPassword123!',

  // Attorney for approval (if needed)
  attorneyEmail: process.env.ATTORNEY_EMAIL || 'attorney@lawfirm.com',
  attorneyPassword: process.env.ATTORNEY_PASSWORD || 'TestPassword123!',

  // Case information
  creditorName: process.env.CREDITOR_NAME || 'Premier Financial Services',
  debtorName: process.env.DEBTOR_NAME || 'Johnathan Skeete',
  debtorEmail: process.env.DEBTOR_EMAIL || 'jskeete@gmail.com',
  debtAmount: process.env.DEBT_AMOUNT || '4850.00',

  // Initial aggressive draft (what the paralegal types first)
  aggressiveDraft: `Dear ${process.env.DEBTOR_NAME || 'Johnathan Skeete'},

You owe us $${process.env.DEBT_AMOUNT || '4850.00'} and you MUST pay immediately or we will take legal action against you.

This is your FINAL WARNING. We are prepared to pursue all legal remedies including wage garnishment, asset seizure, and reporting to credit bureaus.

You have ignored our previous attempts to contact you. This behavior is unacceptable and will not be tolerated.

Pay now or face the consequences.

Premier Financial Services Collections Department`,

  // AI refinement conversation prompts
  aiConversation: [
    {
      userPrompt: 'The tone seems harsh. Can you help me make this more professional and less threatening?',
      expectedResponse: 'warmer', // keyword to check for
    },
    {
      userPrompt: 'I want to emphasize that we want to avoid litigation and help the debtor resolve this amicably. Can you add that?',
      expectedResponse: 'avoid',
    },
    {
      userPrompt: 'Please mention that the debtor can access credit repair services and negotiate a settlement through the Partner app.',
      expectedResponse: 'Partner',
    },
  ],

  // Final expected letter elements (for verification)
  expectedLetterElements: [
    'avoid litigation',
    'credit repair',
    'settlement',
    'Partner',
  ],
};

test.describe('Demand Letter Workflow with AI Refinement', () => {

  test('Complete workflow: create case, draft letter, AI refinement, and send', async ({ demoPage: page }) => {
    test.slow();

    // ========================================
    // STEP 1: Login as Paralegal
    // ========================================
    console.log('Step 1: Logging in as paralegal');

    await navigateWithPause(page, '/login', {
      waitForSelector: 'form',
      orientationPause: 2000,
    });

    await pauseForReading(page, 2, 'Viewing login page');

    await fillFieldSlowly(page, '#email', TEST_CONFIG.paralegalEmail, 'Email');
    await fillFieldSlowly(page, '#password', TEST_CONFIG.paralegalPassword, 'Password');

    await pauseForReading(page, 1, 'Credentials entered');

    await smoothClick(page, 'button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await pauseForReading(page, 3, 'Dashboard loaded - paralegal logged in');

    // ========================================
    // STEP 2: Navigate to Cases and Create New Case
    // ========================================
    console.log('Step 2: Creating new case');

    await navigateWithPause(page, '/cases', {
      orientationPause: 2000,
    });

    await pauseForReading(page, 2, 'Viewing cases list');

    // Click "New Case" button
    const newCaseButton = page.locator('button:has-text("New Case"), button:has-text("Create Case")');
    if (await newCaseButton.count() > 0) {
      await smoothClick(page, newCaseButton.first());
      await waitForModal(page, '.fixed.inset-0', 2);

      // Fill case creation form
      console.log('Filling case creation form');

      // Creditor Name
      const creditorInput = page.locator('input').filter({ has: page.locator('+ label:has-text("Creditor"), ~ label:has-text("Creditor")') }).first();
      const creditorByPlaceholder = page.locator('input[placeholder*="creditor" i]');
      if (await creditorByPlaceholder.count() > 0) {
        await fillFieldSlowly(page, creditorByPlaceholder, TEST_CONFIG.creditorName, 'Creditor Name');
      } else {
        // Try by label text nearby
        await fillFieldSlowly(page, 'input:near(:text("Creditor Name"))', TEST_CONFIG.creditorName, 'Creditor Name');
      }

      // Debtor Name
      const debtorNameInput = page.locator('input[placeholder*="debtor name" i]');
      if (await debtorNameInput.count() > 0) {
        await fillFieldSlowly(page, debtorNameInput, TEST_CONFIG.debtorName, 'Debtor Name');
      } else {
        await fillFieldSlowly(page, 'input:near(:text("Debtor Name"))', TEST_CONFIG.debtorName, 'Debtor Name');
      }

      // Debtor Email - KEY FIELD
      const debtorEmailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
      if (await debtorEmailInput.count() > 0) {
        await fillFieldSlowly(page, debtorEmailInput.first(), TEST_CONFIG.debtorEmail, 'Debtor Email');
      }

      // Debt Amount
      const debtAmountInput = page.locator('input[type="number"], input[placeholder*="amount" i]');
      if (await debtAmountInput.count() > 0) {
        await fillFieldSlowly(page, debtAmountInput.first(), TEST_CONFIG.debtAmount, 'Debt Amount');
      }

      await pauseForReading(page, 2, 'Case details entered');

      // Submit case creation
      const createButton = page.locator('button:has-text("Create"), button:has-text("Submit")').last();
      await smoothClick(page, createButton);

      // Wait for case to be created
      await page.waitForTimeout(2000);
      await pauseForReading(page, 2, 'Case created successfully');
    }

    // ========================================
    // STEP 3: Open Case and Navigate to Demand Letters
    // ========================================
    console.log('Step 3: Opening case to create demand letter');

    // Find and click the newly created case or first available case
    const caseLink = page.locator('a[href*="/cases/view"], tr:has-text("' + TEST_CONFIG.debtorName + '") a').first();
    if (await caseLink.count() > 0) {
      await smoothClick(page, caseLink);
      await pauseForReading(page, 2, 'Case opened');
    } else {
      // Navigate directly if no case link found
      await navigateWithPause(page, '/cases', { orientationPause: 1000 });
      const firstCase = page.locator('a[href*="/cases/view"]').first();
      if (await firstCase.count() > 0) {
        await smoothClick(page, firstCase);
      }
    }

    // Click on Demand Letters tab
    const demandLettersTab = page.locator('button:has-text("Demand Letters"), [role="tab"]:has-text("Demand"), a:has-text("Demand Letters")');
    if (await demandLettersTab.count() > 0) {
      await smoothClick(page, demandLettersTab.first());
      await pauseForReading(page, 2, 'Demand Letters section');
    }

    // ========================================
    // STEP 4: Create New Demand Letter with AGGRESSIVE Draft
    // ========================================
    console.log('Step 4: Creating demand letter with aggressive initial draft');

    // Click to create new letter or edit draft
    const newLetterButton = page.locator('button:has-text("New Letter"), button:has-text("Create Letter"), button:has-text("Draft")');
    if (await newLetterButton.count() > 0) {
      await smoothClick(page, newLetterButton.first());
      await pauseForReading(page, 2, 'Letter editor opened');
    }

    // Find the letter editor/content area
    const editor = page.locator('textarea, [contenteditable="true"], [class*="editor"]').first();
    if (await editor.count() > 0) {
      await smoothClick(page, editor);
      await pauseForReading(page, 1);

      // Type the AGGRESSIVE draft slowly for dramatic effect
      console.log('Typing aggressive initial draft...');
      await typeSlowly(page, editor, TEST_CONFIG.aggressiveDraft, {
        delayPerChar: 30, // Faster for long text
        clearFirst: true,
        pauseAfter: 2000,
      });

      await pauseForReading(page, 4, 'Initial aggressive draft written - notice the harsh tone');
    }

    // ========================================
    // STEP 5: AI-Guided Refinement Conversation
    // ========================================
    console.log('Step 5: AI-guided refinement conversation');

    // Look for AI refinement panel or chat
    const refinementPanel = page.locator('[class*="refinement"], [class*="Refinement"], [class*="ai-assist"], [class*="chat"]');
    const refinementInput = page.locator('input[placeholder*="refine" i], textarea[placeholder*="instruction" i], input[placeholder*="ask" i], textarea[placeholder*="message" i]');

    if (await refinementPanel.count() > 0 || await refinementInput.count() > 0) {
      await smoothScrollTo(page, refinementPanel.count() > 0 ? refinementPanel.first() : refinementInput.first());

      // Conversation Turn 1: Make it less threatening
      console.log('AI Conversation Turn 1: Requesting professional tone');
      if (await refinementInput.count() > 0) {
        await fillFieldSlowly(
          page,
          refinementInput.first(),
          TEST_CONFIG.aiConversation[0].userPrompt,
          'AI Prompt 1'
        );

        const sendButton = page.locator('button:has-text("Send"), button:has-text("Apply"), button:has-text("Refine"), button[type="submit"]').last();
        if (await sendButton.count() > 0) {
          await smoothClick(page, sendButton);
          await page.waitForTimeout(5000); // Wait for AI response
          await pauseForReading(page, 5, 'AI suggests warmer, more professional tone');
        }
      }

      // Accept the suggestion if there's an accept button
      const acceptButton = page.locator('button:has-text("Accept"), button:has-text("Apply Changes")');
      if (await acceptButton.count() > 0) {
        await smoothClick(page, acceptButton.first());
        await pauseForReading(page, 2, 'First refinement accepted');
      }

      // Conversation Turn 2: Avoid litigation
      console.log('AI Conversation Turn 2: Emphasize avoiding litigation');
      if (await refinementInput.count() > 0) {
        await fillFieldSlowly(
          page,
          refinementInput.first(),
          TEST_CONFIG.aiConversation[1].userPrompt,
          'AI Prompt 2'
        );

        const sendButton2 = page.locator('button:has-text("Send"), button:has-text("Apply"), button:has-text("Refine")').last();
        if (await sendButton2.count() > 0) {
          await smoothClick(page, sendButton2);
          await page.waitForTimeout(5000);
          await pauseForReading(page, 5, 'AI adds language about avoiding litigation');
        }
      }

      if (await acceptButton.count() > 0) {
        await smoothClick(page, acceptButton.first());
        await pauseForReading(page, 2, 'Second refinement accepted');
      }

      // Conversation Turn 3: Partner app benefits
      console.log('AI Conversation Turn 3: Adding Partner app benefits');
      if (await refinementInput.count() > 0) {
        await fillFieldSlowly(
          page,
          refinementInput.first(),
          TEST_CONFIG.aiConversation[2].userPrompt,
          'AI Prompt 3'
        );

        const sendButton3 = page.locator('button:has-text("Send"), button:has-text("Apply"), button:has-text("Refine")').last();
        if (await sendButton3.count() > 0) {
          await smoothClick(page, sendButton3);
          await page.waitForTimeout(5000);
          await pauseForReading(page, 5, 'AI adds credit repair and settlement negotiation info');
        }
      }

      if (await acceptButton.count() > 0) {
        await smoothClick(page, acceptButton.first());
        await pauseForReading(page, 3, 'Final refinement accepted - letter now professional and helpful');
      }
    } else {
      // Fallback: Use quick suggestion buttons if available
      console.log('Looking for quick suggestion buttons');
      const professionalButton = page.locator('button:has-text("professional"), button:has-text("Professional")');
      if (await professionalButton.count() > 0) {
        await smoothClick(page, professionalButton.first());
        await page.waitForTimeout(3000);
        await pauseForReading(page, 3, 'Professional tone applied');
      }
    }

    // ========================================
    // STEP 6: Review Final Letter
    // ========================================
    console.log('Step 6: Reviewing final refined letter');

    // Scroll to see the full letter
    if (await editor.count() > 0) {
      await smoothScrollTo(page, editor);
      await pauseForReading(page, 5, 'Reviewing final letter - warm, professional, emphasizes resolution');
    }

    // Check compliance panel if present
    const compliancePanel = page.locator('[class*="compliance"], [class*="Compliance"]');
    if (await compliancePanel.count() > 0) {
      await smoothScrollTo(page, compliancePanel.first());
      await pauseForReading(page, 3, 'Compliance check passed');
    }

    // ========================================
    // STEP 7: Submit for Attorney Review
    // ========================================
    console.log('Step 7: Submitting for attorney review');

    const submitButton = page.locator('button:has-text("Submit for Review"), button:has-text("Submit")');
    if (await submitButton.count() > 0) {
      await smoothScrollTo(page, submitButton.first());
      await pauseForReading(page, 1);
      await smoothClick(page, submitButton.first());
      await page.waitForTimeout(2000);
      await pauseForReading(page, 3, 'Letter submitted for attorney review');
    }

    // ========================================
    // STEP 8: Attorney Approval (if in same session)
    // ========================================
    console.log('Step 8: Checking for attorney approval flow');

    // If there's an approval button visible (attorney role), click it
    const approveButton = page.locator('button:has-text("Approve"), button:has-text("Approved")');
    if (await approveButton.count() > 0) {
      await smoothClick(page, approveButton.first());
      await pauseForReading(page, 2, 'Letter approved by attorney');
    }

    // ========================================
    // STEP 9: Send Letter to Debtor
    // ========================================
    console.log('Step 9: Sending letter to debtor');

    const sendLetterButton = page.locator('button:has-text("Send Letter"), button:has-text("Send to Debtor"), button:has-text("Send")');
    if (await sendLetterButton.count() > 0) {
      await smoothScrollTo(page, sendLetterButton.first());
      await smoothClick(page, sendLetterButton.first());

      // Handle send confirmation modal
      const confirmModal = page.locator('.fixed.inset-0, [role="dialog"]');
      if (await confirmModal.count() > 0) {
        await pauseForReading(page, 2, 'Send confirmation dialog');

        // Type SEND or check acknowledgment
        const sendConfirmInput = page.locator('input[placeholder*="SEND" i], input[type="text"]');
        if (await sendConfirmInput.count() > 0) {
          await fillFieldSlowly(page, sendConfirmInput.first(), 'SEND', 'Confirmation');
        }

        const confirmCheckbox = page.locator('input[type="checkbox"]');
        if (await confirmCheckbox.count() > 0) {
          await smoothClick(page, confirmCheckbox.first());
        }

        // Click final confirm button
        const confirmSendButton = page.locator('button:has-text("Confirm"), button:has-text("Send")').last();
        if (await confirmSendButton.count() > 0) {
          await smoothClick(page, confirmSendButton);
          await page.waitForTimeout(2000);
        }
      }

      await pauseForReading(page, 3, `Letter sent to ${TEST_CONFIG.debtorEmail}`);
    }

    // ========================================
    // FINAL: Summary
    // ========================================
    console.log('Demand letter workflow complete!');
    console.log(`Letter sent to: ${TEST_CONFIG.debtorEmail}`);
    await pauseForReading(page, 4, 'Demo complete - demand letter workflow finished');
  });

  test('AI refinement transforms aggressive to professional tone', async ({ demoPage: page }) => {
    test.slow();

    console.log('Demo: AI Tone Transformation');
    console.log('This demo focuses on the AI refinement conversation');

    // Login
    await navigateWithPause(page, '/login', { waitForSelector: 'form' });
    await fillFieldSlowly(page, '#email', TEST_CONFIG.paralegalEmail, 'Email');
    await fillFieldSlowly(page, '#password', TEST_CONFIG.paralegalPassword, 'Password');
    await smoothClick(page, 'button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // Navigate to existing case with draft letter
    await navigateWithPause(page, '/cases', { orientationPause: 1000 });

    const caseLink = page.locator('a[href*="/cases/view"]').first();
    if (await caseLink.count() > 0) {
      await smoothClick(page, caseLink);
    }

    // Open demand letters
    const demandLettersTab = page.locator('button:has-text("Demand Letters"), [role="tab"]:has-text("Demand")');
    if (await demandLettersTab.count() > 0) {
      await smoothClick(page, demandLettersTab.first());
      await pauseForReading(page, 2);
    }

    // Open a draft letter
    const draftLetter = page.locator('[class*="draft"], button:has-text("Draft"), a:has-text("Draft")').first();
    if (await draftLetter.count() > 0) {
      await smoothClick(page, draftLetter);
      await pauseForReading(page, 2);
    }

    // Demonstrate AI refinement with multiple turns
    const refinementInput = page.locator('input[placeholder*="refine" i], textarea[placeholder*="instruction" i]');

    if (await refinementInput.count() > 0) {
      // Show initial content
      await pauseForReading(page, 3, 'Current letter content - needs improvement');

      // Refinement: Professional tone
      await fillFieldSlowly(page, refinementInput.first(),
        'Please rewrite this in a warmer, more professional tone that shows empathy for the debtor\'s situation.',
        'Refinement request'
      );

      const applyButton = page.locator('button:has-text("Apply"), button:has-text("Refine")');
      if (await applyButton.count() > 0) {
        await smoothClick(page, applyButton.first());
        await page.waitForTimeout(5000);
        await pauseForReading(page, 4, 'AI transformed to professional, empathetic tone');
      }

      // Refinement: Add resolution focus
      await fillFieldSlowly(page, refinementInput.first(),
        'Add a section that emphasizes our mutual goal of avoiding litigation and finding a resolution that works for everyone.',
        'Adding resolution focus'
      );

      if (await applyButton.count() > 0) {
        await smoothClick(page, applyButton.first());
        await page.waitForTimeout(5000);
        await pauseForReading(page, 4, 'Letter now emphasizes avoiding litigation');
      }

      // Refinement: Partner app benefits
      await fillFieldSlowly(page, refinementInput.first(),
        'Include information about the Partner app where the debtor can: 1) Negotiate a settlement, 2) Access credit repair services, 3) Set up a payment plan.',
        'Adding Partner app benefits'
      );

      if (await applyButton.count() > 0) {
        await smoothClick(page, applyButton.first());
        await page.waitForTimeout(5000);
        await pauseForReading(page, 5, 'Letter now includes Partner app benefits - credit repair and settlement options');
      }
    }

    await pauseForReading(page, 3, 'AI refinement demo complete - letter transformed from aggressive to helpful');
  });
});
