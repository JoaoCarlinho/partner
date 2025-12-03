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
} from '../../utils/demo-helpers';

// ============================================
// CONFIGURABLE TEST VALUES
// ============================================

const TEST_CONFIG = {
  // API URL for backend requests (CloudFront HTTPS proxy for Elastic Beanstalk)
  // Falls back to the production CloudFront backend proxy if not set
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://d1comazpq780af.cloudfront.net',

  // Admin credentials (for case creation)
  adminEmail: process.env.ADMIN_EMAIL || 'admin@lawfirm.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'TestPassword123!',

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
  // This draft intentionally uses threatening language, ALL CAPS, and aggressive phrases
  // that the AI should identify and suggest improvements for
  aggressiveDraft: `Dear ${process.env.DEBTOR_NAME || 'Johnathan Skeete'},

YOU OWE US $${process.env.DEBT_AMOUNT || '4850.00'} AND YOU MUST PAY IMMEDIATELY!!!

This is your FINAL WARNING before we DESTROY your credit score and TAKE EVERYTHING you own.

We WILL garnish your wages. We WILL seize your assets. We WILL report you to every credit bureau and RUIN your financial future.

You have been IGNORING us and this PATHETIC behavior will NOT be tolerated any longer. We know where you live and we know where you work.

PAY NOW OR FACE THE CONSEQUENCES. You have been warned.

Don't make us come after you. This is your LAST CHANCE.

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

  test('Complete workflow: admin creates case, paralegal drafts letter with AI refinement, and sends', async ({ demoPage: page }) => {
    test.slow();

    // ========================================
    // PART A: ADMIN CREATES THE CASE
    // ========================================

    // ========================================
    // STEP 1: Login as Firm Admin
    // ========================================
    console.log('Step 1: Logging in as Firm Admin');

    await navigateWithPause(page, '/login', {
      waitForSelector: 'form',
      orientationPause: 2000,
    });

    await pauseForReading(page, 2, 'Viewing login page - Admin login');

    await fillFieldSlowly(page, '#email', TEST_CONFIG.adminEmail, 'Admin Email');
    await fillFieldSlowly(page, '#password', TEST_CONFIG.adminPassword, 'Admin Password');

    await pauseForReading(page, 1, 'Admin credentials entered');

    await smoothClick(page, 'button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await pauseForReading(page, 3, 'Dashboard loaded - Firm Admin logged in');

    // ========================================
    // STEP 2: Admin Views Active Cases
    // ========================================
    console.log('Step 2: Admin viewing active cases');

    await navigateWithPause(page, '/cases', {
      orientationPause: 2000,
    });

    await pauseForReading(page, 4, 'Admin viewing all active cases for the firm');

    // Show the existing cases
    const existingCases = page.locator('table tbody tr, [class*="case-card"], [class*="case-item"]');
    const caseCount = await existingCases.count();
    console.log(`Found ${caseCount} existing cases`);
    await pauseForReading(page, 3, `Firm has ${caseCount} active cases`);

    // ========================================
    // STEP 3: Admin Creates New Case
    // ========================================
    console.log('Step 3: Admin creating new case for Johnathan Skeete');

    // Click "New Case" button
    const newCaseButton = page.locator('button:has-text("New Case"), button:has-text("Create Case"), a:has-text("New Case")');
    if (await newCaseButton.count() > 0) {
      await smoothClick(page, newCaseButton.first());
      await pauseForReading(page, 2, 'Opening case creation form');

      // Wait for form or modal to appear
      await page.waitForTimeout(1000);

      // Fill case creation form - try multiple selector strategies
      console.log('Filling case creation form');

      await pauseForReading(page, 2, 'Case creation form ready');

      // Creditor Name - use exact placeholder to avoid search field
      const creditorSelectors = [
        'input[name="creditorName"]',
        'input[placeholder="Enter creditor name"]',
        '[role="dialog"] input[placeholder*="creditor" i]',
        'form input[placeholder*="creditor" i]:not([placeholder*="Search"])',
      ];
      for (const selector of creditorSelectors) {
        const count = await page.locator(selector).count();
        if (count === 1) {
          await fillFieldSlowly(page, selector, TEST_CONFIG.creditorName, 'Creditor Name');
          break;
        }
      }

      // Debtor Name - use exact placeholder
      const debtorNameSelectors = [
        'input[name="debtorName"]',
        'input[placeholder="Enter debtor name"]',
        '[role="dialog"] input[placeholder*="debtor name" i]',
      ];
      for (const selector of debtorNameSelectors) {
        const count = await page.locator(selector).count();
        if (count === 1) {
          await fillFieldSlowly(page, selector, TEST_CONFIG.debtorName, 'Debtor Name');
          break;
        }
      }

      // Debtor Email - KEY FIELD
      const emailSelectors = [
        'input[name="debtorEmail"]',
        'input[placeholder="Enter debtor email"]',
        '[role="dialog"] input[type="email"]',
        '[role="dialog"] input[placeholder*="email" i]',
      ];
      for (const selector of emailSelectors) {
        const count = await page.locator(selector).count();
        if (count === 1) {
          await fillFieldSlowly(page, selector, TEST_CONFIG.debtorEmail, 'Debtor Email');
          break;
        }
      }

      // Debt Amount
      const amountSelectors = [
        'input[name="debtAmount"]',
        'input[placeholder="Enter debt amount"]',
        '[role="dialog"] input[type="number"]',
        '[role="dialog"] input[placeholder*="amount" i]',
      ];
      for (const selector of amountSelectors) {
        if (await page.locator(selector).count() > 0) {
          await fillFieldSlowly(page, selector, TEST_CONFIG.debtAmount, 'Debt Amount');
          break;
        }
      }

      await pauseForReading(page, 3, `Case details: ${TEST_CONFIG.debtorName}, ${TEST_CONFIG.debtorEmail}, $${TEST_CONFIG.debtAmount}`);

      // Submit case creation
      const createButton = page.locator('button:has-text("Create"), button:has-text("Submit"), button[type="submit"]').last();
      await smoothClick(page, createButton);

      // Wait for case to be created and modal to close
      await page.waitForTimeout(3000);

      // Verify case was created by checking it appears in the table
      await page.waitForSelector('table tbody tr', { timeout: 10000 });
      await pauseForReading(page, 3, 'New case created successfully by Admin');
    }

    // ========================================
    // STEP 4: Admin Logs Out
    // ========================================
    console.log('Step 4: Admin logging out');

    // Look for logout button/menu
    const userMenu = page.locator('button:has-text("Account"), [aria-label="User menu"], button:has-text("admin"), [class*="avatar"], [class*="user-menu"]');
    if (await userMenu.count() > 0) {
      await smoothClick(page, userMenu.first());
      await page.waitForTimeout(500);
    }

    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log out"), button:has-text("Sign out"), a:has-text("Logout")');
    if (await logoutButton.count() > 0) {
      await smoothClick(page, logoutButton.first());
      await page.waitForTimeout(1000);
    } else {
      // Alternative: navigate to logout URL directly
      await page.goto('/logout');
      await page.waitForTimeout(1000);
    }

    // Clear cookies and storage to ensure complete logout
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.waitForTimeout(500);

    await pauseForReading(page, 2, 'Admin logged out - session cleared');

    // ========================================
    // PART B: PARALEGAL DRAFTS AND REFINES LETTER
    // ========================================

    // ========================================
    // STEP 5: Login as Paralegal
    // ========================================
    console.log('Step 5: Logging in as Paralegal');

    await navigateWithPause(page, '/login', {
      waitForSelector: 'form',
      orientationPause: 2000,
    });

    await pauseForReading(page, 2, 'Viewing login page - Paralegal login');

    await fillFieldSlowly(page, '#email', TEST_CONFIG.paralegalEmail, 'Paralegal Email');
    await fillFieldSlowly(page, '#password', TEST_CONFIG.paralegalPassword, 'Paralegal Password');

    await pauseForReading(page, 1, 'Paralegal credentials entered');

    await smoothClick(page, 'button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await pauseForReading(page, 3, 'Dashboard loaded - Paralegal logged in');

    // ========================================
    // STEP 6: Navigate to Cases and Find New Case
    // ========================================
    console.log('Step 6: Paralegal finding the new case');

    // Debug: Check auth state before navigation
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
    const userData = await page.evaluate(() => localStorage.getItem('user'));
    console.log('Auth token exists:', !!authToken);
    console.log('Auth token (first 50 chars):', authToken?.substring(0, 50));
    console.log('User data:', userData);

    // Click on the Cases link in the navigation (more reliable than page.goto)
    const casesNavLink = page.locator('a:has-text("Cases")').first();
    await expect(casesNavLink).toBeVisible({ timeout: 5000 });
    await smoothClick(page, casesNavLink);

    // Wait for navigation to cases page
    await page.waitForURL('**/cases/**', { timeout: 15000 });
    console.log('Navigated to cases page, URL:', page.url());

    await pauseForReading(page, 3, 'Viewing cases list as Paralegal');

    // Wait for page to fully load and API to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Extra wait for API

    // Check current page state
    const hasTable = await page.locator('table').count() > 0;
    const hasLoadingSpinner = await page.locator('.animate-spin').count() > 0;
    const hasNoCasesMessage = await page.locator('text="No cases found"').count() > 0;
    console.log(`Page state - Table: ${hasTable}, Loading: ${hasLoadingSpinner}, No cases message: ${hasNoCasesMessage}`);

    // Wait for either cases to load or no cases message
    try {
      await Promise.race([
        page.waitForSelector('table tbody tr', { timeout: 15000 }),
        page.waitForSelector('text="No cases found"', { timeout: 15000 }),
      ]);
    } catch {
      console.log('Neither table rows nor "No cases found" message appeared');
      await page.screenshot({ path: 'e2e/demo-results/debug-cases-page.png' });
    }

    const caseRows = page.locator('table tbody tr');
    const rowCount = await caseRows.count();
    console.log(`Found ${rowCount} cases in the table`);

    // Log status but continue - we'll search by debtor name if no cases in table
    if (rowCount === 0) {
      console.log('WARNING: No cases visible in table. Checking for newly created case...');
      await page.screenshot({ path: 'e2e/demo-results/debug-no-cases-paralegal.png' });

      // The case we just created might not be visible yet - wait a bit longer and retry
      await page.waitForTimeout(3000);
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    // Recheck after potential reload
    const finalRowCount = await caseRows.count();
    console.log(`Final case count after retry: ${finalRowCount}`);

    await pauseForReading(page, 2, `Found ${finalRowCount} cases available`);

    // ========================================
    // STEP 7: Open Case and Navigate to Demand Letters
    // ========================================
    console.log('Step 7: Opening case to create demand letter');

    // If still no cases, try to find by searching for our debtor name
    if (finalRowCount === 0) {
      console.log('No cases in table - looking for search functionality or trying to navigate directly');

      // Check if there's a search input and search for our debtor
      const searchInputSelector = 'input[placeholder*="Search"], input[type="search"]';
      const searchInput = page.locator(searchInputSelector);
      if (await searchInput.count() > 0) {
        await fillFieldSlowly(page, searchInputSelector, TEST_CONFIG.debtorName, 'Search for debtor');
        await page.waitForTimeout(2000);
      }

      // Check again for cases
      const searchRowCount = await caseRows.count();
      console.log(`Cases after search: ${searchRowCount}`);

      if (searchRowCount === 0) {
        console.log('WARNING: Still no cases visible. The case creation may have failed or RBAC is blocking.');
        // Instead of failing, let's try to continue with whatever case might exist
      }
    }

    // Click the "View" link for the case matching our debtor name (handles multiple cases)
    const targetRow = page.getByRole('row', { name: new RegExp(TEST_CONFIG.debtorName) });
    const viewLink = targetRow.getByRole('link', { name: 'View' });
    await expect(viewLink).toBeVisible({ timeout: 5000 });
    await viewLink.click();

    // Wait for case view page to load
    await page.waitForURL('**/cases/view**', { timeout: 10000 });
    await pauseForReading(page, 3, 'Case details loaded');

    // Click on the "demands" tab (lowercase in the UI)
    const demandsTabSelector = 'button:has-text("demands")';
    await expect(page.locator(demandsTabSelector)).toBeVisible({ timeout: 5000 });
    await smoothClick(page, demandsTabSelector);
    await pauseForReading(page, 2, 'Demand Letters tab selected');

    // ========================================
    // STEP 8: Generate Demand Letter with Harsh Initial Draft
    // ========================================
    console.log('Step 8: Generating demand letter with harsh initial draft');

    // First go back to details tab to access the Generate button
    const detailsTabSelector = 'button:has-text("details")';
    await smoothClick(page, detailsTabSelector);
    await pauseForReading(page, 2, 'Case details view');

    // Click "Generate Demand Letter" button
    const generateLetterSelector = 'button:has-text("Generate Demand Letter")';
    await expect(page.locator(generateLetterSelector)).toBeVisible({ timeout: 5000 });
    await smoothClick(page, generateLetterSelector);

    // Wait for letter generation (can take up to 30 seconds)
    console.log('Waiting for AI to generate letter...');
    await pauseForReading(page, 3, 'AI is generating the demand letter...');

    // Wait for the generated letter to appear
    const generatedLetterSelector = 'h4:has-text("Demand Letter Generated"), .bg-green-50';
    await expect(page.locator(generatedLetterSelector).first()).toBeVisible({ timeout: 60000 });

    // Get the letter ID from the DOM (displayed as "Letter ID: xxx")
    // Wait for a valid UUID-format letter ID to appear (not "generating" or loading states)
    let letterId: string | null = null;

    // First try URL params
    letterId = new URL(page.url()).searchParams.get('letterId');

    if (!letterId) {
      // Wait for a valid letter ID to appear in the DOM (UUID format)
      // The ID should be a UUID like "abc123-def456-..." not "generating"
      const maxRetries = 30; // Wait up to 30 seconds
      for (let i = 0; i < maxRetries; i++) {
        const letterIdText = await page.locator('text=Letter ID:').textContent();
        if (letterIdText) {
          // Match UUID format (8-4-4-4-12 hex characters) or similar alphanumeric IDs
          const match = letterIdText.match(/Letter ID:\s*([a-f0-9]{8,}-[a-f0-9-]+)/i);
          if (match && match[1] !== 'generating') {
            letterId = match[1];
            break;
          }
        }
        // Wait 1 second before retrying
        await page.waitForTimeout(1000);
        console.log(`Waiting for letter ID... (attempt ${i + 1}/${maxRetries})`);
      }
    }
    console.log('Generated letter ID:', letterId);

    // Replace the AI-generated content with the harsh initial draft via API
    // This simulates the paralegal drafting a harsh letter that needs refinement
    if (letterId) {
      console.log('Replacing letter content with harsh initial draft...');
      const token = await page.evaluate(() => localStorage.getItem('authToken'));

      // Store the case view URL before making changes
      const caseViewUrl = page.url();
      console.log('Case view URL:', caseViewUrl);
      console.log('API URL:', TEST_CONFIG.apiUrl);

      // Use Playwright's request API to bypass browser CORS/mixed-content restrictions
      // (The browser blocks HTTP requests from HTTPS pages, but Playwright's request API works directly)
      const response = await page.request.patch(`${TEST_CONFIG.apiUrl}/api/v1/demands/${letterId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        data: { content: TEST_CONFIG.aggressiveDraft },
      });

      if (response.ok()) {
        console.log('Successfully replaced with harsh draft');
        // Reload the page to show the updated content
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        // Verify we're still on the case view page, if not navigate back
        const afterReloadUrl = page.url();
        console.log('After reload URL:', afterReloadUrl);
        if (!afterReloadUrl.includes('/cases/view')) {
          console.log('Redirected away from case view, navigating back to:', caseViewUrl);
          await page.goto(caseViewUrl);
          await page.waitForURL('**/cases/view**', { timeout: 10000 });
          await page.waitForLoadState('networkidle');
        }

        // Click on the Demand Letters tab again to ensure we see the letter
        const demandLettersTab = page.locator('button').filter({ hasText: /demands/i }).first();
        await expect(demandLettersTab).toBeVisible({ timeout: 5000 });
        await demandLettersTab.click();
        await page.waitForTimeout(500);
      } else {
        console.warn('Failed to update letter content:', response.status());
      }
    } else {
      console.warn('Could not find letter ID - unable to replace with harsh draft');
    }

    await pauseForReading(page, 4, 'Initial harsh demand letter loaded - ready for AI refinement');

    // ========================================
    // STEP 8b: Read through the initial letter before refinement
    // ========================================
    console.log('Step 8b: Reading through initial harsh letter');

    // Scroll to the letter content and read through it
    const initialLetterSelector = '.bg-green-50 pre, .bg-white pre';
    const initialLetterContent = page.locator(initialLetterSelector).first();
    if (await initialLetterContent.count() > 0) {
      await smoothScrollTo(page, initialLetterContent);
      await pauseForReading(page, 3, 'Reading initial letter - note the harsh, threatening tone');

      // Scroll slowly through the letter to demonstrate reading
      await page.evaluate(async () => {
        const letterElement = document.querySelector('.bg-green-50 pre, .bg-white pre');
        if (letterElement) {
          const scrollHeight = letterElement.scrollHeight;
          const viewportHeight = letterElement.clientHeight;
          const scrollSteps = 3;
          const scrollDelay = 1500;

          for (let i = 0; i <= scrollSteps; i++) {
            const scrollPosition = (scrollHeight - viewportHeight) * (i / scrollSteps);
            letterElement.scrollTop = scrollPosition;
            await new Promise(resolve => setTimeout(resolve, scrollDelay));
          }
        }
      });
      await pauseForReading(page, 2, 'Initial letter uses aggressive language - needs refinement');
    }

    // ========================================
    // STEP 9: AI-Guided Refinement Conversation (Chat Interface)
    // ========================================
    console.log('Step 9: AI-guided refinement conversation (chat interface)');

    // Scroll to see the chat panel
    const chatPanelSelector = 'h3:has-text("AI Refinement Assistant")';
    await expect(page.locator(chatPanelSelector)).toBeVisible({ timeout: 10000 });
    await smoothScrollTo(page, page.locator(chatPanelSelector));
    await pauseForReading(page, 2, 'AI Refinement Chat ready');

    // Wait for AI to proactively analyze the letter and send first message
    console.log('Waiting for AI to analyze letter proactively...');
    const chatMessagesSelector = '[data-testid="chat-messages"]';
    await expect(page.locator(chatMessagesSelector)).toBeVisible({ timeout: 5000 });

    // Wait for AI's initial analysis message (look for assistant message with analysis)
    const aiMessageSelector = '.bg-gray-100.rounded-lg';
    await expect(page.locator(aiMessageSelector).first()).toBeVisible({ timeout: 60000 });
    await pauseForReading(page, 4, 'AI has analyzed the letter and provided feedback');

    // Read through the AI's analysis
    const aiAnalysisMessage = page.locator(aiMessageSelector).first();
    await smoothScrollTo(page, aiAnalysisMessage);
    await pauseForReading(page, 5, 'AI identifies tone issues and suggests improvements');

    // The chat input and send button
    const chatInputSelector = '[data-testid="chat-input"]';
    const sendButtonSelector = '[data-testid="chat-send"]';
    const acceptButtonSelector = 'button:has-text("Accept Changes")';

    // Conversation Turn 1: Respond to AI's analysis - Make it more professional
    console.log('AI Conversation Turn 1: Requesting professional tone');
    await expect(page.locator(chatInputSelector)).toBeVisible({ timeout: 5000 });
    await fillFieldSlowly(
      page,
      chatInputSelector,
      TEST_CONFIG.aiConversation[0].userPrompt,
      'Chat message 1'
    );
    await pauseForReading(page, 2, 'Responding to AI: requesting professional tone');

    await smoothClick(page, sendButtonSelector);
    console.log('Waiting for AI refinement...');

    // Wait for refinement results (shows "Accept Changes" button when done)
    await expect(page.locator(acceptButtonSelector)).toBeVisible({ timeout: 60000 });
    await pauseForReading(page, 4, 'AI suggests warmer, more professional tone');

    // Accept the refinement
    await smoothClick(page, acceptButtonSelector);
    await pauseForReading(page, 2, 'First refinement accepted');

    // Read through the letter after first refinement
    console.log('Reading letter after first refinement');
    const firstRefinedLetter = page.locator('.bg-green-50 pre, .bg-white pre').first();
    if (await firstRefinedLetter.count() > 0) {
      await smoothScrollTo(page, firstRefinedLetter);
      await pauseForReading(page, 3, 'Reading refined letter - now more professional and empathetic');

      // Scroll through the letter content
      await page.evaluate(async () => {
        const letterElement = document.querySelector('.bg-green-50 pre, .bg-white pre');
        if (letterElement) {
          const scrollHeight = letterElement.scrollHeight;
          const viewportHeight = letterElement.clientHeight;
          const scrollSteps = 3;
          const scrollDelay = 1200;

          for (let i = 0; i <= scrollSteps; i++) {
            const scrollPosition = (scrollHeight - viewportHeight) * (i / scrollSteps);
            letterElement.scrollTop = scrollPosition;
            await new Promise(resolve => setTimeout(resolve, scrollDelay));
          }
        }
      });
      await pauseForReading(page, 2, 'First refinement improved tone significantly');
    }

    // Conversation Turn 2: Avoid litigation
    console.log('AI Conversation Turn 2: Emphasize avoiding litigation');
    await expect(page.locator(chatInputSelector)).toBeVisible({ timeout: 10000 });
    await fillFieldSlowly(
      page,
      chatInputSelector,
      TEST_CONFIG.aiConversation[1].userPrompt,
      'Chat message 2'
    );
    await pauseForReading(page, 2, 'Chatting with AI: avoid litigation');

    await smoothClick(page, sendButtonSelector);
    await expect(page.locator(acceptButtonSelector)).toBeVisible({ timeout: 60000 });
    await pauseForReading(page, 4, 'AI adds language about avoiding litigation');

    await smoothClick(page, acceptButtonSelector);
    await pauseForReading(page, 2, 'Second refinement accepted');

    // Read through the letter after second refinement
    console.log('Reading letter after second refinement');
    const secondRefinedLetter = page.locator('.bg-green-50 pre, .bg-white pre').first();
    if (await secondRefinedLetter.count() > 0) {
      await smoothScrollTo(page, secondRefinedLetter);
      await pauseForReading(page, 3, 'Reading letter - now emphasizes avoiding litigation');

      // Scroll through the letter content
      await page.evaluate(async () => {
        const letterElement = document.querySelector('.bg-green-50 pre, .bg-white pre');
        if (letterElement) {
          const scrollHeight = letterElement.scrollHeight;
          const viewportHeight = letterElement.clientHeight;
          const scrollSteps = 3;
          const scrollDelay = 1200;

          for (let i = 0; i <= scrollSteps; i++) {
            const scrollPosition = (scrollHeight - viewportHeight) * (i / scrollSteps);
            letterElement.scrollTop = scrollPosition;
            await new Promise(resolve => setTimeout(resolve, scrollDelay));
          }
        }
      });
      await pauseForReading(page, 2, 'Second refinement added amicable resolution language');
    }

    // Conversation Turn 3: Partner app benefits
    console.log('AI Conversation Turn 3: Adding Partner app benefits');
    await expect(page.locator(chatInputSelector)).toBeVisible({ timeout: 10000 });
    await fillFieldSlowly(
      page,
      chatInputSelector,
      TEST_CONFIG.aiConversation[2].userPrompt,
      'Chat message 3'
    );
    await pauseForReading(page, 2, 'Chatting with AI: Partner app benefits');

    await smoothClick(page, sendButtonSelector);
    await expect(page.locator(acceptButtonSelector)).toBeVisible({ timeout: 60000 });
    await pauseForReading(page, 4, 'AI adds credit repair and settlement negotiation info');

    await smoothClick(page, acceptButtonSelector);
    await pauseForReading(page, 3, 'Final refinement accepted - letter now professional and helpful');

    // ========================================
    // STEP 10: Review Final Letter
    // ========================================
    console.log('Step 10: Reviewing final refined letter');

    // Scroll to see the full letter content
    const letterContentSelector = '.bg-green-50 pre, .bg-white pre';
    if (await page.locator(letterContentSelector).count() > 0) {
      await smoothScrollTo(page, page.locator(letterContentSelector).first());
      await pauseForReading(page, 5, 'Reviewing final letter - warm, professional, emphasizes resolution');
    }

    // ========================================
    // STEP 11: Navigate to Demands Tab to Submit for Review
    // ========================================
    console.log('Step 11: Checking letter status in demands tab');

    // Go to demands tab to see letter list and status
    await smoothClick(page, demandsTabSelector);
    await pauseForReading(page, 3, 'Viewing demand letters for this case');

    // Look for submit for review or send options
    const submitButtonSelector = 'button:has-text("Submit for Review"), button:has-text("Submit")';
    if (await page.locator(submitButtonSelector).count() > 0) {
      await smoothClick(page, submitButtonSelector);
      await pauseForReading(page, 3, 'Letter submitted for attorney review');
    }

    // ========================================
    // STEP 12: Check for Send Option
    // ========================================
    console.log('Step 12: Checking for send letter option');

    const sendLetterButtonSelector = 'button:has-text("Send Letter"), button:has-text("Send to Debtor")';
    if (await page.locator(sendLetterButtonSelector).count() > 0) {
      await smoothScrollTo(page, page.locator(sendLetterButtonSelector).first());
      await smoothClick(page, sendLetterButtonSelector);

      // Handle send confirmation modal if it appears
      const modalSelector = '.fixed.inset-0, [role="dialog"]';
      if (await page.locator(modalSelector).count() > 0) {
        await pauseForReading(page, 2, 'Send confirmation dialog');

        // Look for confirmation input or checkbox
        const sendConfirmInputSelector = 'input[placeholder*="SEND" i]';
        if (await page.locator(sendConfirmInputSelector).count() > 0) {
          await fillFieldSlowly(page, sendConfirmInputSelector, 'SEND', 'Confirmation');
        }

        const confirmCheckboxSelector = 'input[type="checkbox"]';
        if (await page.locator(confirmCheckboxSelector).count() > 0) {
          await smoothClick(page, confirmCheckboxSelector);
        }

        // Click final confirm button
        const confirmSendButtonSelector = 'button:has-text("Confirm Send"), button:has-text("Send"):not(:disabled)';
        if (await page.locator(confirmSendButtonSelector).count() > 0) {
          await smoothClick(page, confirmSendButtonSelector);
          await page.waitForTimeout(2000);
        }
      }

      await pauseForReading(page, 3, `Letter sent to ${TEST_CONFIG.debtorEmail}`);
    } else {
      console.log('No send button found - letter may need attorney approval first');
      await pauseForReading(page, 3, 'Letter is ready - may require attorney approval before sending');
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

    const caseLinkSelector = 'a[href*="/cases/view"]';
    if (await page.locator(caseLinkSelector).count() > 0) {
      await smoothClick(page, caseLinkSelector);
    }

    // Open demand letters
    const demandLettersTabSelector = 'button:has-text("Demand Letters"), [role="tab"]:has-text("Demand")';
    if (await page.locator(demandLettersTabSelector).count() > 0) {
      await smoothClick(page, demandLettersTabSelector);
      await pauseForReading(page, 2);
    }

    // Open a draft letter
    const draftLetterSelector = '[class*="draft"], button:has-text("Draft"), a:has-text("Draft")';
    if (await page.locator(draftLetterSelector).count() > 0) {
      await smoothClick(page, draftLetterSelector);
      await pauseForReading(page, 2);
    }

    // Demonstrate AI refinement with multiple turns
    const refinementInputSelector = 'input[placeholder*="refine" i], textarea[placeholder*="instruction" i]';

    if (await page.locator(refinementInputSelector).count() > 0) {
      // Show initial content
      await pauseForReading(page, 3, 'Current letter content - needs improvement');

      // Refinement: Professional tone
      await fillFieldSlowly(page, refinementInputSelector,
        'Please rewrite this in a warmer, more professional tone that shows empathy for the debtor\'s situation.',
        'Refinement request'
      );

      const applyButtonSelector = 'button:has-text("Apply"), button:has-text("Refine")';
      if (await page.locator(applyButtonSelector).count() > 0) {
        await smoothClick(page, applyButtonSelector);
        await page.waitForTimeout(5000);
        await pauseForReading(page, 4, 'AI transformed to professional, empathetic tone');
      }

      // Refinement: Add resolution focus
      await fillFieldSlowly(page, refinementInputSelector,
        'Add a section that emphasizes our mutual goal of avoiding litigation and finding a resolution that works for everyone.',
        'Adding resolution focus'
      );

      if (await page.locator(applyButtonSelector).count() > 0) {
        await smoothClick(page, applyButtonSelector);
        await page.waitForTimeout(5000);
        await pauseForReading(page, 4, 'Letter now emphasizes avoiding litigation');
      }

      // Refinement: Partner app benefits
      await fillFieldSlowly(page, refinementInputSelector,
        'Include information about the Partner app where the debtor can: 1) Negotiate a settlement, 2) Access credit repair services, 3) Set up a payment plan.',
        'Adding Partner app benefits'
      );

      if (await page.locator(applyButtonSelector).count() > 0) {
        await smoothClick(page, applyButtonSelector);
        await page.waitForTimeout(5000);
        await pauseForReading(page, 5, 'Letter now includes Partner app benefits - credit repair and settlement options');
      }
    }

    await pauseForReading(page, 3, 'AI refinement demo complete - letter transformed from aggressive to helpful');
  });
});
