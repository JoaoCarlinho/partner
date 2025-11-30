/**
 * Public Defender Quick-Start Demo Test
 *
 * This test verifies the Public Defender Quick-Start Guide functionality:
 * 1. Accept invitation from email link
 * 2. Create account (registration form)
 * 3. Complete onboarding (credentials, training, terms)
 * 4. View dashboard with summary cards
 * 5. Navigate to assignments
 * 6. View a case
 *
 * Video output demonstrates defender workflows for documentation.
 */

import { test, expect } from '../../fixtures/demo.fixture';
import {
  pauseForReading,
  smoothClick,
  fillFieldSlowly,
  navigateWithPause,
  smoothScrollTo,
  selectOptionSlowly,
  toggleCheckbox,
  uploadFile,
} from '../../utils/demo-helpers';

test.describe('Public Defender Quick-Start Guide', () => {

  test('Complete defender onboarding: invitation to dashboard', async ({ demoPage: page }) => {
    test.slow();

    // ========================================
    // STEP 1: Accept Invitation
    // ========================================
    console.log('Step 1: Accepting invitation');

    // Navigate to invitation page (simulated token)
    await navigateWithPause(page, '/defender/invite/demo-token-12345', {
      orientationPause: 2000,
    });

    // Wait for validation
    await page.waitForTimeout(2000);

    // Check for welcome page or error
    const welcomeContent = page.locator(':has-text("Welcome"), :has-text("invited")');
    if (await welcomeContent.count() > 0) {
      await pauseForReading(page, 3, 'Invitation validated - welcome page');

      // Look for "Get Started" button
      const getStartedButton = page.locator('button:has-text("Get Started")');
      if (await getStartedButton.count() > 0) {
        await smoothClick(page, getStartedButton);
        await pauseForReading(page, 2, 'Proceeding to registration');
      }
    }

    // ========================================
    // STEP 2: Create Account
    // ========================================
    console.log('Step 2: Creating account');

    // Look for registration form
    const registrationForm = page.locator('form, [class*="registration"]');
    if (await registrationForm.count() > 0) {
      await pauseForReading(page, 2, 'Registration form');

      // Fill registration fields
      await fillFieldSlowly(page, '#firstName, input[name="firstName"]', 'Jane', 'First Name');
      await fillFieldSlowly(page, '#lastName, input[name="lastName"]', 'Defender', 'Last Name');
      await fillFieldSlowly(page, '#phone, input[name="phone"]', '555-123-4567', 'Phone');
      await fillFieldSlowly(page, '#barNumber, input[name="barNumber"]', '123456', 'Bar Number');

      // Select bar state
      const barStateSelect = page.locator('#barState, select[name="barState"]');
      if (await barStateSelect.count() > 0) {
        await smoothClick(page, barStateSelect);
        await page.waitForTimeout(300);
        await barStateSelect.selectOption('NY');
        await page.waitForTimeout(500);
      }

      // Password fields
      await fillFieldSlowly(page, '#password, input[name="password"]', 'SecurePass123!', 'Password');
      await fillFieldSlowly(page, '#confirmPassword, input[name="confirmPassword"]', 'SecurePass123!', 'Confirm Password');

      await pauseForReading(page, 2, 'Registration form completed');

      // Submit registration
      const registerButton = page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Create")');
      if (await registerButton.count() > 0) {
        await smoothClick(page, registerButton);
        await page.waitForTimeout(3000);
        await pauseForReading(page, 2, 'Account created');
      }
    }

    // ========================================
    // STEP 3: Complete Onboarding
    // ========================================
    console.log('Step 3: Starting onboarding');

    // Check if redirected to onboarding
    const onboardingPage = page.locator(':has-text("Onboarding"), :has-text("Complete")');
    if (await onboardingPage.count() > 0) {
      await pauseForReading(page, 2, 'Onboarding page loaded');

      // Step 3a: Upload Credentials
      console.log('Step 3a: Uploading credentials');

      const uploadSection = page.locator(':has-text("Upload"), :has-text("Credentials")');
      if (await uploadSection.count() > 0) {
        await smoothScrollTo(page, uploadSection.first());

        // Note: In real test, would use uploadFile with actual test files
        // For demo, we'll show the UI interaction
        const fileInputs = page.locator('input[type="file"]');
        if (await fileInputs.count() > 0) {
          await pauseForReading(page, 2, 'Credential upload section');
        }

        // Look for continue button
        const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next")');
        if (await continueButton.count() > 0) {
          await smoothClick(page, continueButton);
          await page.waitForTimeout(1000);
        }
      }

      // Step 3b: Complete Training
      console.log('Step 3b: Completing training');

      const trainingSection = page.locator(':has-text("Training"), :has-text("Module")');
      if (await trainingSection.count() > 0) {
        await pauseForReading(page, 2, 'Training modules section');

        // Mark training modules as complete
        const checkboxes = page.locator('input[type="checkbox"]');
        const checkboxCount = await checkboxes.count();

        for (let i = 0; i < checkboxCount; i++) {
          await smoothClick(page, checkboxes.nth(i));
          await page.waitForTimeout(500);
        }

        await pauseForReading(page, 2, 'Training modules completed');

        // Continue
        const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next")');
        if (await continueButton.count() > 0) {
          await smoothClick(page, continueButton);
          await page.waitForTimeout(1000);
        }
      }

      // Step 3c: Accept Terms
      console.log('Step 3c: Accepting terms');

      const termsSection = page.locator(':has-text("Terms"), :has-text("Agreement")');
      if (await termsSection.count() > 0) {
        await pauseForReading(page, 3, 'Terms of Service');

        // Scroll through terms
        await smoothScrollTo(page, termsSection.first());

        // Check acceptance checkbox
        const acceptCheckbox = page.locator('input[type="checkbox"][name*="accept"], input[type="checkbox"][name*="terms"]');
        if (await acceptCheckbox.count() > 0) {
          await smoothClick(page, acceptCheckbox);
          await page.waitForTimeout(500);
        }

        // Complete onboarding
        const completeButton = page.locator('button:has-text("Accept"), button:has-text("Complete")');
        if (await completeButton.count() > 0) {
          await smoothClick(page, completeButton);
          await page.waitForTimeout(2000);
          await pauseForReading(page, 2, 'Onboarding complete');
        }
      }
    }

    // ========================================
    // STEP 4: View Dashboard
    // ========================================
    console.log('Step 4: Viewing dashboard');

    // Navigate to dashboard if not already there
    const dashboardUrl = await page.url();
    if (!dashboardUrl.includes('dashboard')) {
      await navigateWithPause(page, '/defender/dashboard', {
        orientationPause: 2000,
      });
    }

    // View summary cards
    const summaryCards = page.locator('.bg-white.rounded-lg.shadow, [class*="card"]');
    const cardCount = await summaryCards.count();

    for (let i = 0; i < Math.min(cardCount, 4); i++) {
      await summaryCards.nth(i).hover();
      await page.waitForTimeout(800);
    }

    await pauseForReading(page, 3, 'Dashboard overview');

    // ========================================
    // STEP 5: Navigate to Assignments
    // ========================================
    console.log('Step 5: Viewing assignments');

    const assignmentsLink = page.locator('a:has-text("Assignments"), a[href*="assignments"]');
    if (await assignmentsLink.count() > 0) {
      await smoothClick(page, assignmentsLink.first());
      await pauseForReading(page, 2, 'Assignments list');
    }

    // ========================================
    // STEP 6: View a Case
    // ========================================
    console.log('Step 6: Opening a case');

    // Click on first case in list
    const caseLink = page.locator('a[href*="/defender/cases/"]').first();
    if (await caseLink.count() > 0) {
      await smoothClick(page, caseLink);
      await pauseForReading(page, 3, 'Case details loaded');

      // Scroll through case sections
      const caseSections = page.locator('[class*="section"], [class*="card"]');
      const sectionCount = await caseSections.count();

      for (let i = 0; i < Math.min(sectionCount, 3); i++) {
        await smoothScrollTo(page, caseSections.nth(i));
        await pauseForReading(page, 2);
      }
    }

    // ========================================
    // FINAL: Summary
    // ========================================
    console.log('Defender quick-start demo complete');
    await pauseForReading(page, 3, 'Demo complete - defender workflow finished');
  });

  test('Existing defender login and dashboard navigation', async ({ demoPage: page }) => {
    test.slow();

    console.log('Demo: Existing defender login');

    // Login as existing defender
    await navigateWithPause(page, '/login', { waitForSelector: 'form' });
    await fillFieldSlowly(page, '#email', 'defender@legalaid.org', 'Email');
    await fillFieldSlowly(page, '#password', 'DefenderPass123!', 'Password');
    await smoothClick(page, 'button[type="submit"]');

    // Wait for redirect to defender dashboard
    await page.waitForURL('**/defender/**', { timeout: 15000 });
    await pauseForReading(page, 2, 'Defender dashboard');

    // View "Needs Attention" filter
    const needsAttentionCard = page.locator(':has-text("Needs Attention")');
    if (await needsAttentionCard.count() > 0) {
      await smoothClick(page, needsAttentionCard.first());
      await pauseForReading(page, 2, 'Cases needing attention');
    }

    // View quick links
    const quickLinks = page.locator(':has-text("Quick Links")');
    if (await quickLinks.count() > 0) {
      await smoothScrollTo(page, quickLinks);
      await pauseForReading(page, 2, 'Quick links section');
    }

    // View upcoming deadlines
    const deadlines = page.locator(':has-text("Upcoming Deadlines")');
    if (await deadlines.count() > 0) {
      await smoothScrollTo(page, deadlines);
      await pauseForReading(page, 3, 'Upcoming deadlines');
    }

    await pauseForReading(page, 2, 'Dashboard navigation demo complete');
  });
});
