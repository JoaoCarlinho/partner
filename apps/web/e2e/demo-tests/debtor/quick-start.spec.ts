/**
 * Debtor Quick-Start Demo Test
 *
 * This test verifies the Debtor Quick-Start Guide functionality:
 * 1. Use invitation link from letter
 * 2. Verify identity
 * 3. Create account
 * 4. View dashboard overview
 * 5. View amount owed breakdown
 * 6. View plain English version of letter
 * 7. Explore available options
 * 8. Interact with help resources
 *
 * Video output demonstrates debtor workflows for documentation.
 */

import { test, expect } from '../../fixtures/demo.fixture';
import {
  pauseForReading,
  smoothClick,
  fillFieldSlowly,
  navigateWithPause,
  smoothScrollTo,
  sendChatMessage,
} from '../../utils/demo-helpers';

test.describe('Debtor Quick-Start Guide', () => {

  test('Complete debtor onboarding and dashboard exploration', async ({ demoPage: page }) => {
    test.slow();

    // ========================================
    // STEP 1: Use Invitation Link
    // ========================================
    console.log('Step 1: Using invitation link');

    // Simulate debtor receiving letter with link
    await navigateWithPause(page, '/invite/debtor-demo-token', {
      orientationPause: 2000,
    });

    await pauseForReading(page, 2, 'Invitation page loaded');

    // ========================================
    // STEP 2: Verify Identity
    // ========================================
    console.log('Step 2: Verifying identity');

    // Look for verification form
    const verifyForm = page.locator('form, :has-text("Verify")');
    if (await verifyForm.count() > 0) {
      // Enter last 4 SSN
      const ssnInput = page.locator('input[name*="ssn"], input[placeholder*="SSN"], input[type="text"]').first();
      if (await ssnInput.count() > 0) {
        await fillFieldSlowly(page, ssnInput, '1234', 'Last 4 SSN');
      }

      // Date of birth if required
      const dobInput = page.locator('input[name*="dob"], input[type="date"]');
      if (await dobInput.count() > 0) {
        await fillFieldSlowly(page, dobInput, '1985-06-15', 'Date of Birth');
      }

      // Click verify button
      const verifyButton = page.locator('button:has-text("Verify"), button[type="submit"]');
      if (await verifyButton.count() > 0) {
        await smoothClick(page, verifyButton);
        await page.waitForTimeout(2000);
        await pauseForReading(page, 2, 'Identity verified');
      }
    }

    // ========================================
    // STEP 3: Create Account
    // ========================================
    console.log('Step 3: Creating account');

    // Look for registration/account creation form
    const accountForm = page.locator('form:has(input[type="email"])');
    if (await accountForm.count() > 0) {
      await fillFieldSlowly(page, 'input[type="email"], #email', 'john.doe@example.com', 'Email');
      await fillFieldSlowly(page, 'input[type="password"], #password', 'SecurePass123!', 'Password');

      // Confirm password if field exists
      const confirmPassword = page.locator('input[name*="confirm"], #confirmPassword');
      if (await confirmPassword.count() > 0) {
        await fillFieldSlowly(page, confirmPassword, 'SecurePass123!', 'Confirm Password');
      }

      await pauseForReading(page, 2, 'Account details entered');

      // Create account
      const createButton = page.locator('button:has-text("Create"), button:has-text("Register"), button[type="submit"]');
      if (await createButton.count() > 0) {
        await smoothClick(page, createButton);
        await page.waitForTimeout(3000);
        await pauseForReading(page, 2, 'Account created successfully');
      }
    }

    // ========================================
    // STEP 4: View Dashboard Overview
    // ========================================
    console.log('Step 4: Viewing dashboard');

    // Ensure we're on debtor dashboard
    const currentUrl = await page.url();
    if (!currentUrl.includes('debtor')) {
      await navigateWithPause(page, '/debtor/dashboard', {
        orientationPause: 2000,
      });
    }

    await pauseForReading(page, 3, 'Dashboard loaded');

    // ========================================
    // STEP 5: View Amount Owed Breakdown
    // ========================================
    console.log('Step 5: Viewing amount owed');

    const amountCard = page.locator(':has-text("Amount Owed"), :has-text("Total Amount"), [class*="amount"]');
    if (await amountCard.count() > 0) {
      await smoothScrollTo(page, amountCard.first());
      await pauseForReading(page, 4, 'Amount owed breakdown');

      // Look for breakdown details
      const breakdown = page.locator(':has-text("Original"), :has-text("Interest"), :has-text("Fees")');
      if (await breakdown.count() > 0) {
        await smoothScrollTo(page, breakdown.first());
        await pauseForReading(page, 3, 'Fee breakdown details');
      }
    }

    // ========================================
    // STEP 6: View Timeline
    // ========================================
    console.log('Step 6: Viewing timeline');

    const timeline = page.locator(':has-text("Timeline"), :has-text("Deadline"), [class*="timeline"]');
    if (await timeline.count() > 0) {
      await smoothScrollTo(page, timeline.first());
      await pauseForReading(page, 3, 'Important dates and timeline');
    }

    // ========================================
    // STEP 7: View Creditor Information
    // ========================================
    console.log('Step 7: Viewing creditor info');

    const creditorInfo = page.locator(':has-text("Creditor"), :has-text("From")');
    if (await creditorInfo.count() > 0) {
      await smoothScrollTo(page, creditorInfo.first());
      await pauseForReading(page, 2, 'Creditor information');
    }

    // ========================================
    // STEP 8: View Plain English Version
    // ========================================
    console.log('Step 8: Viewing plain English version');

    const plainEnglishToggle = page.locator('button:has-text("Plain English"), button:has-text("Simplified"), :has-text("View simplified")');
    if (await plainEnglishToggle.count() > 0) {
      await smoothClick(page, plainEnglishToggle.first());
      await pauseForReading(page, 5, 'Plain English version of demand letter');

      // Scroll through simplified content
      const simplifiedContent = page.locator('[class*="simplified"], [class*="plain"]');
      if (await simplifiedContent.count() > 0) {
        await smoothScrollTo(page, simplifiedContent.first());
        await pauseForReading(page, 3, 'Reading simplified explanation');
      }
    }

    // ========================================
    // STEP 9: Explore Options
    // ========================================
    console.log('Step 9: Exploring options');

    const optionsSection = page.locator(':has-text("Options"), :has-text("What you can do")');
    if (await optionsSection.count() > 0) {
      await smoothScrollTo(page, optionsSection.first());
      await pauseForReading(page, 2, 'Available options');
    }

    // Hover over each option to show details
    const options = ['Pay', 'Dispute', 'Negotiate', 'Get Help'];
    for (const option of options) {
      const optionButton = page.locator(`button:has-text("${option}"), [class*="option"]:has-text("${option}")`);
      if (await optionButton.count() > 0) {
        await optionButton.first().hover();
        await pauseForReading(page, 1.5, `${option} option`);
      }
    }

    // ========================================
    // STEP 10: View Payment Options
    // ========================================
    console.log('Step 10: Viewing payment options');

    const payButton = page.locator('button:has-text("Pay"), button:has-text("Payment")').first();
    if (await payButton.count() > 0) {
      await smoothClick(page, payButton);
      await pauseForReading(page, 3, 'Payment options available');

      // Check for payment plan option
      const paymentPlan = page.locator(':has-text("Payment Plan"), :has-text("Set Up")');
      if (await paymentPlan.count() > 0) {
        await smoothClick(page, paymentPlan.first());
        await pauseForReading(page, 2, 'Payment plan setup');
      }

      // Go back
      const backButton = page.locator('button:has-text("Back"), button:has-text("Cancel")');
      if (await backButton.count() > 0) {
        await smoothClick(page, backButton);
      }
    }

    // ========================================
    // STEP 11: Get Help Option
    // ========================================
    console.log('Step 11: Exploring help options');

    const helpButton = page.locator('button:has-text("Get Help"), button:has-text("Help"), button:has-text("Support")');
    if (await helpButton.count() > 0) {
      await smoothClick(page, helpButton.first());
      await pauseForReading(page, 3, 'Help resources available');
    }

    // ========================================
    // STEP 12: AI Assistant (if available)
    // ========================================
    console.log('Step 12: Using AI assistant');

    const chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="question"]');
    if (await chatInput.count() > 0) {
      await sendChatMessage(
        page,
        chatInput,
        'button:has-text("Send"), button[type="submit"]',
        'What are my options if I cannot pay the full amount?',
        '[class*="response"], [class*="message"]:last-child'
      );
    }

    // ========================================
    // FINAL: Summary
    // ========================================
    console.log('Debtor quick-start demo complete');
    await pauseForReading(page, 3, 'Demo complete - debtor experience overview');
  });

  test('Debtor login and dashboard navigation', async ({ demoPage: page }) => {
    test.slow();

    console.log('Demo: Existing debtor login');

    // Login as existing debtor
    await navigateWithPause(page, '/login', { waitForSelector: 'form' });
    await fillFieldSlowly(page, '#email', 'john.debtor@example.com', 'Email');
    await fillFieldSlowly(page, '#password', 'DebtorPass123!', 'Password');
    await smoothClick(page, 'button[type="submit"]');

    // Wait for debtor dashboard
    await page.waitForURL('**/debtor/**', { timeout: 15000 });
    await pauseForReading(page, 3, 'Debtor dashboard');

    // View account overview
    const overview = page.locator(':has-text("Account Overview")');
    if (await overview.count() > 0) {
      await smoothScrollTo(page, overview);
      await pauseForReading(page, 2, 'Account overview section');
    }

    // View payment options
    const payOptions = page.locator(':has-text("Payment Options")');
    if (await payOptions.count() > 0) {
      await smoothScrollTo(page, payOptions);
      await pauseForReading(page, 2, 'Payment options section');
    }

    // Demonstrate logout
    const logoutButton = page.locator('button:has-text("Sign out"), button:has-text("Logout")');
    if (await logoutButton.count() > 0) {
      await smoothClick(page, logoutButton);
      await pauseForReading(page, 2, 'Logged out successfully');
    }

    await pauseForReading(page, 2, 'Dashboard navigation demo complete');
  });

  test('Debtor dispute workflow', async ({ demoPage: page }) => {
    test.slow();

    console.log('Demo: Filing a dispute');

    // Login as debtor
    await navigateWithPause(page, '/login', { waitForSelector: 'form' });
    await fillFieldSlowly(page, '#email', 'john.debtor@example.com', 'Email');
    await fillFieldSlowly(page, '#password', 'DebtorPass123!', 'Password');
    await smoothClick(page, 'button[type="submit"]');
    await page.waitForURL('**/debtor/**', { timeout: 15000 });

    // Find and click dispute option
    const disputeButton = page.locator('button:has-text("Dispute")');
    if (await disputeButton.count() > 0) {
      await smoothClick(page, disputeButton);
      await pauseForReading(page, 2, 'Dispute options');

      // Look for dispute form
      const disputeForm = page.locator('form, [class*="dispute"]');
      if (await disputeForm.count() > 0) {
        // Select dispute reason
        const reasonSelect = page.locator('select, [role="combobox"]');
        if (await reasonSelect.count() > 0) {
          await smoothClick(page, reasonSelect.first());
          await page.waitForTimeout(500);
        }

        // Enter dispute details
        const detailsInput = page.locator('textarea');
        if (await detailsInput.count() > 0) {
          await fillFieldSlowly(
            page,
            detailsInput,
            'I believe this debt amount is incorrect. I have records showing a lower balance.',
            'Dispute details'
          );
        }

        await pauseForReading(page, 2, 'Dispute form filled');

        // Note: In demo, we don't submit to avoid creating actual disputes
        const cancelButton = page.locator('button:has-text("Cancel")');
        if (await cancelButton.count() > 0) {
          await smoothClick(page, cancelButton);
        }
      }
    }

    await pauseForReading(page, 2, 'Dispute workflow demo complete');
  });
});
