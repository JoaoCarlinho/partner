/**
 * Admin Quick-Start Demo Test
 *
 * This test verifies the Admin Quick-Start Guide functionality:
 * 1. Login as admin
 * 2. Navigate to Defender Invitations
 * 3. View invitation statistics
 * 4. Create a new defender invitation
 * 5. View invitation in the list
 * 6. Filter and search invitations
 *
 * Video output demonstrates admin workflows for documentation.
 */

import { test, expect } from '../../fixtures/demo.fixture';
import {
  pauseForReading,
  smoothClick,
  fillFieldSlowly,
  navigateWithPause,
  smoothScrollTo,
  waitForModal,
  closeModal,
  scanTable,
} from '../../utils/demo-helpers';

test.describe('Admin Quick-Start Guide', () => {

  test('Complete admin workflow: invite a public defender', async ({ demoPage: page }) => {
    // Mark as slow test (extended timeout)
    test.slow();

    // ========================================
    // STEP 1: Login as Admin
    // ========================================
    console.log('Step 1: Logging in as admin');

    await navigateWithPause(page, '/login', {
      waitForSelector: 'form',
      orientationPause: 2000,
    });

    await pauseForReading(page, 2, 'Viewing login page');

    // Fill login form
    await fillFieldSlowly(page, '#email', 'admin@lawfirm.com', 'Email');
    await fillFieldSlowly(page, '#password', 'TestPassword123!', 'Password');

    await pauseForReading(page, 1, 'Review credentials before login');

    // Click sign in button
    await smoothClick(page, 'button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await pauseForReading(page, 3, 'Admin dashboard loaded');

    // ========================================
    // STEP 2: Navigate to Defender Invitations
    // ========================================
    console.log('Step 2: Navigating to Defender Invitations');

    // Navigate directly to invitations page (append index.html for static S3/CloudFront hosting)
    await navigateWithPause(page, '/admin/defenders/invitations/index.html', {
      orientationPause: 2000,
    });

    // Wait for page to load
    await page.locator('h1:has-text("Defender Invitations")').waitFor({ state: 'visible' });
    await pauseForReading(page, 3, 'Defender Invitations page loaded');

    // ========================================
    // STEP 3: View Invitation Statistics
    // ========================================
    console.log('Step 3: Viewing invitation statistics');

    // Highlight each stat card
    const statCards = page.locator('.rounded-lg.p-4');
    const cardCount = await statCards.count();

    for (let i = 0; i < Math.min(cardCount, 4); i++) {
      await statCards.nth(i).hover();
      await page.waitForTimeout(800);
    }

    await pauseForReading(page, 2, 'Statistics overview');

    // ========================================
    // STEP 4: Create New Defender Invitation
    // ========================================
    console.log('Step 4: Creating new defender invitation');

    // Click "Invite Defender" button
    await smoothClick(page, 'button:has-text("Invite Defender")');

    // Wait for modal to appear
    await waitForModal(page, '.fixed.inset-0', 2);

    // Fill invitation form
    await fillFieldSlowly(
      page,
      '#email',
      'jskeete@gmail.com',
      'Defender Email'
    );

    await fillFieldSlowly(
      page,
      '#organizationName',
      'Legal Aid Society',
      'Organization Name'
    );

    await pauseForReading(page, 2, 'Review form before sending');

    // Click "Send Invitation" button
    await smoothClick(page, 'button:has-text("Send Invitation")');

    // Wait for success (toast or modal close)
    await page.waitForTimeout(2000);

    // Check for success message
    const toast = page.locator('.fixed.top-4.right-4');
    if (await toast.count() > 0) {
      await pauseForReading(page, 2, 'Invitation sent successfully');
    }

    // ========================================
    // STEP 5: View Invitation in List
    // ========================================
    console.log('Step 5: Viewing invitation in list');

    // Scroll to table if present
    const table = page.locator('table');
    if (await table.count() > 0) {
      await smoothScrollTo(page, 'table');
      await pauseForReading(page, 2, 'Viewing invitations table');

      // Scan through table rows
      await scanTable(page, 'table', 5);
    }

    // ========================================
    // STEP 6: Filter and Search Invitations
    // ========================================
    console.log('Step 6: Filtering invitations');

    // Click on filter buttons
    const pendingFilter = page.locator('button:has-text("Pending")');
    if (await pendingFilter.count() > 0) {
      await smoothClick(page, pendingFilter);
      await pauseForReading(page, 2, 'Viewing pending invitations');
    }

    // Use search functionality
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.count() > 0) {
      await fillFieldSlowly(
        page,
        'input[placeholder*="Search"]',
        'legalaid',
        'Search query'
      );
      await pauseForReading(page, 2, 'Search results');
    }

    // Reset to "All" filter
    const allFilter = page.locator('button:has-text("All")');
    if (await allFilter.count() > 0) {
      await smoothClick(page, allFilter);
      await pauseForReading(page, 1);
    }

    // ========================================
    // FINAL: Summary
    // ========================================
    console.log('Admin quick-start demo complete');
    await pauseForReading(page, 3, 'Demo complete - final overview');
  });

  test('View invitation status legend', async ({ demoPage: page }) => {
    test.slow();

    console.log('Demo: Invitation Status Overview');

    // Navigate to invitations
    await navigateWithPause(page, '/login', {
      waitForSelector: 'form',
    });

    await fillFieldSlowly(page, '#email', 'admin@lawfirm.com', 'Email');
    await fillFieldSlowly(page, '#password', 'TestPassword123!', 'Password');
    await smoothClick(page, 'button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    await navigateWithPause(page, '/admin/defenders/invitations', {
      orientationPause: 2000,
    });

    await page.locator('h1:has-text("Defender Invitations")').waitFor({ state: 'visible' });

    // Click through each status filter to demonstrate
    const statuses = ['All', 'Pending', 'Redeemed', 'Expired'];

    for (const status of statuses) {
      const filterButton = page.locator(`button:has-text("${status}")`);
      if (await filterButton.count() > 0) {
        await smoothClick(page, filterButton);
        await pauseForReading(page, 2, `Viewing ${status.toLowerCase()} invitations`);
      }
    }

    await pauseForReading(page, 2, 'Status filter demo complete');
  });
});
