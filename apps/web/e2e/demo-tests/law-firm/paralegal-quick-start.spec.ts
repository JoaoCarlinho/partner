/**
 * Paralegal Quick-Start Demo Test
 *
 * This test verifies the Paralegal Quick-Start Guide functionality:
 * 1. Login as paralegal
 * 2. Navigate to a case
 * 3. View demand letters
 * 4. Edit a draft letter (manual editing)
 * 5. Use AI-assisted refinement
 * 6. View version history
 * 7. Submit letter for attorney review
 *
 * Video output demonstrates paralegal workflows for documentation.
 */

import { test, expect } from '../../fixtures/demo.fixture';
import {
  pauseForReading,
  smoothClick,
  fillFieldSlowly,
  navigateWithPause,
  smoothScrollTo,
  typeSlowly,
  sendChatMessage,
  waitForAIResponse,
} from '../../utils/demo-helpers';

test.describe('Paralegal Quick-Start Guide', () => {

  test('Complete paralegal workflow: edit and submit demand letter', async ({ demoPage: page }) => {
    test.slow();

    // ========================================
    // STEP 1: Login as Paralegal
    // ========================================
    console.log('Step 1: Logging in as paralegal');

    await navigateWithPause(page, '/login', {
      waitForSelector: 'form',
      orientationPause: 2000,
    });

    await fillFieldSlowly(page, '#email', 'paralegal@lawfirm.com', 'Email');
    await fillFieldSlowly(page, '#password', 'ParalegalPass123!', 'Password');

    await smoothClick(page, 'button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await pauseForReading(page, 3, 'Dashboard loaded');

    // ========================================
    // STEP 2: Navigate to Cases
    // ========================================
    console.log('Step 2: Navigating to cases');

    await navigateWithPause(page, '/cases', {
      orientationPause: 2000,
    });

    await pauseForReading(page, 2, 'Viewing cases list');

    // ========================================
    // STEP 3: Open a Case
    // ========================================
    console.log('Step 3: Opening a case');

    // Look for case links or cards
    const caseLink = page.locator('a[href*="/cases/view"]').first();
    if (await caseLink.count() > 0) {
      await smoothClick(page, caseLink);
      await pauseForReading(page, 2, 'Case details loaded');
    } else {
      // Navigate directly to a case view
      await navigateWithPause(page, '/cases/view?caseId=demo-case-1', {
        orientationPause: 2000,
      });
    }

    // ========================================
    // STEP 4: View Demand Letters
    // ========================================
    console.log('Step 4: Viewing demand letters');

    // Look for Demand Letters tab or section
    const demandLettersTab = page.locator('button:has-text("Demand Letters"), [role="tab"]:has-text("Demand")');
    if (await demandLettersTab.count() > 0) {
      await smoothClick(page, demandLettersTab);
      await pauseForReading(page, 2, 'Demand Letters section');
    }

    // View the list of letters
    const letterList = page.locator('[class*="letter"], [class*="demand"]');
    if (await letterList.count() > 0) {
      await smoothScrollTo(page, letterList.first());
      await pauseForReading(page, 2, 'Viewing letter list');
    }

    // ========================================
    // STEP 5: Open a Draft Letter
    // ========================================
    console.log('Step 5: Opening draft letter for editing');

    // Click on a draft letter
    const draftLetter = page.locator('[class*="draft"], button:has-text("Draft"), a:has-text("Draft")').first();
    if (await draftLetter.count() > 0) {
      await smoothClick(page, draftLetter);
      await pauseForReading(page, 2, 'Draft letter opened');
    }

    // ========================================
    // STEP 6: Manual Editing
    // ========================================
    console.log('Step 6: Editing letter content');

    // Look for editor or content area
    const editor = page.locator('textarea, [contenteditable="true"], [class*="editor"]').first();
    if (await editor.count() > 0) {
      await smoothClick(page, editor);
      await pauseForReading(page, 1);

      // Type some sample text
      await typeSlowly(page, editor, '\n\nPlease review the attached documentation.', {
        delayPerChar: 80,
        pauseAfter: 1000,
      });

      await pauseForReading(page, 2, 'Content added');
    }

    // ========================================
    // STEP 7: View Compliance Panel
    // ========================================
    console.log('Step 7: Checking compliance');

    const compliancePanel = page.locator('[class*="compliance"], [class*="Compliance"]');
    if (await compliancePanel.count() > 0) {
      await smoothScrollTo(page, compliancePanel.first());
      await pauseForReading(page, 3, 'Reviewing compliance status');
    }

    // ========================================
    // STEP 8: AI Refinement (if available)
    // ========================================
    console.log('Step 8: Using AI refinement');

    const refinementPanel = page.locator('[class*="refinement"], [class*="Refinement"]');
    if (await refinementPanel.count() > 0) {
      await smoothScrollTo(page, refinementPanel.first());

      // Look for refinement input
      const refinementInput = page.locator('input[placeholder*="refine"], textarea[placeholder*="instruction"]');
      if (await refinementInput.count() > 0) {
        await fillFieldSlowly(
          page,
          refinementInput,
          'Make the tone more professional and empathetic',
          'Refinement instruction'
        );

        // Click apply/submit button
        const applyButton = page.locator('button:has-text("Apply"), button:has-text("Refine")');
        if (await applyButton.count() > 0) {
          await smoothClick(page, applyButton);

          // Wait for AI response
          await page.waitForTimeout(5000);
          await pauseForReading(page, 4, 'Reviewing AI refinement');
        }
      }

      // Try quick suggestions
      const quickSuggestion = page.locator('button:has-text("professional"), button:has-text("simplify")').first();
      if (await quickSuggestion.count() > 0) {
        await smoothClick(page, quickSuggestion);
        await page.waitForTimeout(3000);
        await pauseForReading(page, 3, 'Quick suggestion applied');
      }
    }

    // ========================================
    // STEP 9: View Version History
    // ========================================
    console.log('Step 9: Viewing version history');

    const historyButton = page.locator('button:has-text("History"), button:has-text("Version"), [class*="history"]');
    if (await historyButton.count() > 0) {
      await smoothClick(page, historyButton.first());
      await pauseForReading(page, 3, 'Version history panel');

      // Close history if it's a modal
      const closeButton = page.locator('[class*="modal"] button:has-text("Close"), [class*="modal"] button[aria-label="Close"]');
      if (await closeButton.count() > 0) {
        await smoothClick(page, closeButton);
      }
    }

    // ========================================
    // STEP 10: Submit for Review
    // ========================================
    console.log('Step 10: Submitting for attorney review');

    const submitButton = page.locator('button:has-text("Submit for Review"), button:has-text("Submit")');
    if (await submitButton.count() > 0) {
      await smoothScrollTo(page, submitButton);
      await pauseForReading(page, 1);

      await smoothClick(page, submitButton);

      // Wait for confirmation
      await page.waitForTimeout(2000);
      await pauseForReading(page, 3, 'Letter submitted for review');
    }

    // ========================================
    // FINAL: Summary
    // ========================================
    console.log('Paralegal quick-start demo complete');
    await pauseForReading(page, 3, 'Demo complete - paralegal workflow finished');
  });

  test('View and compare letter versions', async ({ demoPage: page }) => {
    test.slow();

    console.log('Demo: Version History Comparison');

    // Login
    await navigateWithPause(page, '/login', { waitForSelector: 'form' });
    await fillFieldSlowly(page, '#email', 'paralegal@lawfirm.com', 'Email');
    await fillFieldSlowly(page, '#password', 'ParalegalPass123!', 'Password');
    await smoothClick(page, 'button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // Navigate to a case with letters
    await navigateWithPause(page, '/cases/view?caseId=demo-case-1', {
      orientationPause: 2000,
    });

    // Open version history
    const historyButton = page.locator('button:has-text("History"), button:has-text("Version")');
    if (await historyButton.count() > 0) {
      await smoothClick(page, historyButton.first());
      await pauseForReading(page, 2, 'Version history opened');

      // Look for version items
      const versions = page.locator('[class*="version-item"], [class*="history-item"]');
      const versionCount = await versions.count();

      if (versionCount >= 2) {
        // Click on older version
        await smoothClick(page, versions.nth(1));
        await pauseForReading(page, 2, 'Viewing older version');

        // Look for compare button
        const compareButton = page.locator('button:has-text("Compare")');
        if (await compareButton.count() > 0) {
          await smoothClick(page, compareButton);
          await pauseForReading(page, 4, 'Viewing version comparison');
        }
      }
    }

    await pauseForReading(page, 2, 'Version comparison demo complete');
  });
});
