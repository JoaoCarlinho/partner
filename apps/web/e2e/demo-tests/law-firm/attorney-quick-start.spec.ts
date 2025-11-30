/**
 * Attorney Quick-Start Demo Test
 *
 * This test verifies the Attorney Quick-Start Guide functionality:
 * 1. Login as attorney
 * 2. View review queue
 * 3. Open a letter pending review
 * 4. Review compliance status
 * 5. Approve letter with digital signature
 * 6. Preview PDF output
 * 7. Mark as sent
 *
 * Video output demonstrates attorney workflows for documentation.
 */

import { test, expect } from '../../fixtures/demo.fixture';
import {
  pauseForReading,
  smoothClick,
  fillFieldSlowly,
  navigateWithPause,
  smoothScrollTo,
  typeSlowly,
  drawSignature,
  waitForModal,
} from '../../utils/demo-helpers';

test.describe('Attorney Quick-Start Guide', () => {

  test('Complete attorney workflow: review and approve demand letter', async ({ demoPage: page }) => {
    test.slow();

    // ========================================
    // STEP 1: Login as Attorney
    // ========================================
    console.log('Step 1: Logging in as attorney');

    await navigateWithPause(page, '/login', {
      waitForSelector: 'form',
      orientationPause: 2000,
    });

    await fillFieldSlowly(page, '#email', 'attorney@lawfirm.com', 'Email');
    await fillFieldSlowly(page, '#password', 'AttorneyPass123!', 'Password');

    await smoothClick(page, 'button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await pauseForReading(page, 3, 'Attorney dashboard loaded');

    // ========================================
    // STEP 2: View Review Queue
    // ========================================
    console.log('Step 2: Viewing review queue');

    // Look for review queue link or navigate to cases
    const reviewQueue = page.locator('a:has-text("Review"), a:has-text("Pending")');
    if (await reviewQueue.count() > 0) {
      await smoothClick(page, reviewQueue.first());
      await pauseForReading(page, 2, 'Review queue');
    } else {
      await navigateWithPause(page, '/cases', {
        orientationPause: 2000,
      });
    }

    // ========================================
    // STEP 3: Open Letter Pending Review
    // ========================================
    console.log('Step 3: Opening letter pending review');

    // Look for pending review items
    const pendingItem = page.locator('[class*="pending"], :has-text("Pending Review")').first();
    if (await pendingItem.count() > 0) {
      await smoothClick(page, pendingItem);
      await pauseForReading(page, 2, 'Letter details loaded');
    } else {
      // Navigate directly to a case
      await navigateWithPause(page, '/cases/view?caseId=demo-case-1', {
        orientationPause: 2000,
      });
    }

    // ========================================
    // STEP 4: Review Letter Content
    // ========================================
    console.log('Step 4: Reviewing letter content');

    // Scroll through the letter content
    const letterContent = page.locator('[class*="content"], [class*="letter"], [class*="editor"]');
    if (await letterContent.count() > 0) {
      await smoothScrollTo(page, letterContent.first());
      await pauseForReading(page, 4, 'Reading letter content');
    }

    // ========================================
    // STEP 5: Check Compliance Status
    // ========================================
    console.log('Step 5: Checking compliance status');

    const compliancePanel = page.locator('[class*="compliance"], [class*="Compliance"]');
    if (await compliancePanel.count() > 0) {
      await smoothScrollTo(page, compliancePanel.first());
      await pauseForReading(page, 3, 'Reviewing compliance status');
    }

    // ========================================
    // STEP 6: View Version Comparison
    // ========================================
    console.log('Step 6: Checking version history');

    const versionButton = page.locator('button:has-text("Version"), button:has-text("History")');
    if (await versionButton.count() > 0) {
      await smoothClick(page, versionButton.first());
      await pauseForReading(page, 2, 'Version history');

      // Close if modal
      const closeButton = page.locator('[class*="modal"] button:has-text("Close")');
      if (await closeButton.count() > 0) {
        await page.waitForTimeout(1000);
        await smoothClick(page, closeButton);
      }
    }

    // ========================================
    // STEP 7: Approve Letter with Signature
    // ========================================
    console.log('Step 7: Approving letter');

    const approveButton = page.locator('button:has-text("Approve")');
    if (await approveButton.count() > 0) {
      await smoothScrollTo(page, approveButton);
      await pauseForReading(page, 1);

      await smoothClick(page, approveButton);

      // Wait for approval modal
      await page.waitForTimeout(1000);

      // Look for signature pad
      const signaturePad = page.locator('canvas, [class*="signature"]');
      if (await signaturePad.count() > 0) {
        await pauseForReading(page, 2, 'Signature pad opened');

        // Draw signature
        await drawSignature(page, 'canvas');

        await pauseForReading(page, 2, 'Signature added');

        // Confirm approval
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Submit")');
        if (await confirmButton.count() > 0) {
          await smoothClick(page, confirmButton);
          await pauseForReading(page, 2, 'Approval confirmed');
        }
      } else {
        // Simple approval without signature
        await pauseForReading(page, 2, 'Letter approved');
      }
    }

    // ========================================
    // STEP 8: Preview PDF
    // ========================================
    console.log('Step 8: Previewing PDF');

    const pdfButton = page.locator('button:has-text("PDF"), button:has-text("Preview")');
    if (await pdfButton.count() > 0) {
      await smoothClick(page, pdfButton.first());
      await pauseForReading(page, 4, 'PDF preview');

      // Close PDF modal
      const closePdfButton = page.locator('[class*="modal"] button:has-text("Close"), [class*="modal"] svg');
      if (await closePdfButton.count() > 0) {
        await smoothClick(page, closePdfButton.first());
      }
    }

    // ========================================
    // STEP 9: Prepare to Send
    // ========================================
    console.log('Step 9: Preparing to send');

    const prepareButton = page.locator('button:has-text("Prepare"), button:has-text("Ready")');
    if (await prepareButton.count() > 0) {
      await smoothClick(page, prepareButton.first());
      await pauseForReading(page, 2, 'Preparing to send');
    }

    // ========================================
    // STEP 10: Mark as Sent
    // ========================================
    console.log('Step 10: Marking as sent');

    const sendButton = page.locator('button:has-text("Mark as Sent"), button:has-text("Send")');
    if (await sendButton.count() > 0) {
      await smoothClick(page, sendButton.first());

      // Confirm if dialog appears
      const confirmSend = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
      if (await confirmSend.count() > 0) {
        await page.waitForTimeout(500);
        await smoothClick(page, confirmSend);
      }

      await pauseForReading(page, 2, 'Letter marked as sent');
    }

    // ========================================
    // FINAL: Summary
    // ========================================
    console.log('Attorney quick-start demo complete');
    await pauseForReading(page, 3, 'Demo complete - attorney workflow finished');
  });

  test('Reject letter with feedback', async ({ demoPage: page }) => {
    test.slow();

    console.log('Demo: Rejecting a letter with feedback');

    // Login
    await navigateWithPause(page, '/login', { waitForSelector: 'form' });
    await fillFieldSlowly(page, '#email', 'attorney@lawfirm.com', 'Email');
    await fillFieldSlowly(page, '#password', 'AttorneyPass123!', 'Password');
    await smoothClick(page, 'button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // Navigate to a case
    await navigateWithPause(page, '/cases/view?caseId=demo-case-2', {
      orientationPause: 2000,
    });

    // Click reject button
    const rejectButton = page.locator('button:has-text("Reject")');
    if (await rejectButton.count() > 0) {
      await smoothClick(page, rejectButton);
      await pauseForReading(page, 1, 'Rejection dialog opened');

      // Enter feedback
      const feedbackInput = page.locator('textarea[placeholder*="feedback"], textarea[placeholder*="reason"]');
      if (await feedbackInput.count() > 0) {
        await typeSlowly(
          page,
          feedbackInput,
          'Please revise the payment terms section to include the 30-day dispute period language. Also, the debtor name needs to be corrected in paragraph 2.',
          { delayPerChar: 60, pauseAfter: 1000 }
        );

        await pauseForReading(page, 2, 'Feedback entered');
      }

      // Submit rejection
      const submitReject = page.locator('button:has-text("Submit"), button:has-text("Reject"):last-child');
      if (await submitReject.count() > 0) {
        await smoothClick(page, submitReject);
        await pauseForReading(page, 2, 'Letter rejected with feedback');
      }
    }

    await pauseForReading(page, 2, 'Rejection demo complete');
  });

  test('Review payment plan proposal', async ({ demoPage: page }) => {
    test.slow();

    console.log('Demo: Reviewing payment plan');

    // Login
    await navigateWithPause(page, '/login', { waitForSelector: 'form' });
    await fillFieldSlowly(page, '#email', 'attorney@lawfirm.com', 'Email');
    await fillFieldSlowly(page, '#password', 'AttorneyPass123!', 'Password');
    await smoothClick(page, 'button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // Navigate to a case with payment plan
    await navigateWithPause(page, '/cases/view?caseId=demo-case-3', {
      orientationPause: 2000,
    });

    // Look for payment plan section
    const paymentSection = page.locator('[class*="payment"], :has-text("Payment Plan")');
    if (await paymentSection.count() > 0) {
      await smoothScrollTo(page, paymentSection.first());
      await pauseForReading(page, 3, 'Payment plan details');

      // Review proposal details
      const proposalDetails = page.locator('[class*="proposal"], [class*="terms"]');
      if (await proposalDetails.count() > 0) {
        await smoothScrollTo(page, proposalDetails.first());
        await pauseForReading(page, 3, 'Reviewing proposal terms');
      }

      // Demonstrate counter-proposal
      const counterButton = page.locator('button:has-text("Counter")');
      if (await counterButton.count() > 0) {
        await smoothClick(page, counterButton);
        await pauseForReading(page, 2, 'Counter-proposal form');

        // Close without submitting
        const cancelButton = page.locator('button:has-text("Cancel")');
        if (await cancelButton.count() > 0) {
          await smoothClick(page, cancelButton);
        }
      }

      // Accept proposal
      const acceptButton = page.locator('button:has-text("Accept")');
      if (await acceptButton.count() > 0) {
        await smoothClick(page, acceptButton);
        await pauseForReading(page, 2, 'Payment plan accepted');
      }
    }

    await pauseForReading(page, 2, 'Payment plan review demo complete');
  });
});
