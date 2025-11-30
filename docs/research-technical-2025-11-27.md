# Technical Research Report: Playwright Configuration for Human-Paced E2E Demo Videos

**Date:** 2025-11-27
**Prepared by:** caiojoao
**Project Context:** Partner Platform - E2E Testing with Video Documentation

---

## Executive Summary

This report provides comprehensive configuration guidance for setting up Playwright to generate human-paced E2E test videos that verify the Partner platform's quick-start user guide functionality. The configuration enables viewers to follow along with test execution, observe button clicks, read text input, and comprehend AI chat interactions.

### Key Recommendation

**Primary Approach:** Custom Playwright configuration with injected demo utilities

**Rationale:** Native Playwright provides excellent video recording capabilities but lacks built-in cursor visualization. A combination of `slowMo` configuration, custom cursor/click injection, and strategic pauses delivers the optimal balance of functionality and maintainability.

**Key Benefits:**
- Full control over interaction pacing
- Professional video output (1080p WebM)
- Visible cursor and click feedback
- No external dependencies beyond Playwright

---

## 1. Research Objectives

### Technical Question

How to configure Playwright for E2E testing that:
1. Verifies functionality from all 5 quick-start user guides
2. Generates professional video documentation
3. Uses human-paced interactions (visible clicks, readable typing, comprehension pauses)
4. Allows viewers to understand what actions are being taken

### Project Context

- **Application:** Partner Platform (debt resolution platform)
- **Personas:** Admin, Paralegal, Attorney, Public Defender, Debtor
- **Test Type:** Documentation/demo videos, not CI/CD speed optimization
- **Current State:** Greenfield test infrastructure

### Requirements and Constraints

#### Functional Requirements

| Requirement | Description |
|-------------|-------------|
| Guide Coverage | All 5 quick-start guides must be verified |
| Video Output | Each test generates a video file |
| Cursor Visibility | Mouse pointer must be visible in recordings |
| Click Feedback | Button/element clicks must be visually highlighted |
| Typing Speed | Text input must be readable (human typing speed) |
| Reading Time | Pauses after content loads for viewer comprehension |
| AI Comprehension | Extended pauses for AI response reading |

#### Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Video Resolution | 1920x1080 (Full HD) |
| Video Format | WebM (convertible to MP4) |
| Interaction Feel | Natural, not robotic |
| Maintainability | Separate from CI/CD test suite |
| Test Duration | Up to 5 minutes per guide |

#### Technical Constraints

| Constraint | Value |
|------------|-------|
| Framework | Playwright (selected) |
| Application Stack | Next.js/React |
| Browser | Chromium (primary) |
| Environment | Local development / CI demo runs |

---

## 2. Configuration Components

### 2.1 Base Configuration (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/demo-tests',

  // Extended timeouts for slow demo pace
  timeout: 5 * 60 * 1000, // 5 minutes per test
  expect: {
    timeout: 30 * 1000,
  },

  // Sequential execution for video coherence
  fullyParallel: false,
  workers: 1,

  // No retries for demo recording
  retries: 0,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'e2e/demo-report' }],
    ['list']
  ],

  use: {
    // Application base URL
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // VIDEO RECORDING - Always on for demos
    video: {
      mode: 'on',
      size: { width: 1920, height: 1080 },
    },

    // Screenshots for debugging
    screenshot: 'on',

    // Full trace for detailed analysis
    trace: 'on',

    // SLOW MOTION - Core setting for human pace
    launchOptions: {
      slowMo: 500, // 500ms delay after every Playwright action
    },

    // Viewport matching video size
    viewport: { width: 1920, height: 1080 },

    // Headed mode for demo purposes
    headless: false,

    // Consistent locale/timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  projects: [
    {
      name: 'demo-chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],

  // Output directory for artifacts
  outputDir: './e2e/demo-results',

  // Web server configuration (optional)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### 2.2 Demo Utilities (`e2e/utils/demo-helpers.ts`)

```typescript
import { Page, Locator } from '@playwright/test';

// ============================================
// CURSOR AND CLICK VISUALIZATION
// ============================================

/**
 * Injects visible cursor and click highlighting into the page.
 * Call this in beforeEach hook for all demo tests.
 */
export async function enableDemoMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Prevent duplicate initialization
    if (document.getElementById('demo-cursor')) return;

    // Create visible cursor element
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.style.cssText = `
      width: 24px;
      height: 24px;
      border: 3px solid #e74c3c;
      border-radius: 50%;
      position: fixed;
      pointer-events: none;
      z-index: 2147483647;
      transition: transform 0.15s ease, background-color 0.15s ease;
      background: rgba(231, 76, 60, 0.2);
      box-shadow: 0 0 10px rgba(231, 76, 60, 0.5);
      transform: translate(-50%, -50%);
    `;
    document.body.appendChild(cursor);

    // Create ripple container for click effects
    const rippleContainer = document.createElement('div');
    rippleContainer.id = 'demo-ripple-container';
    rippleContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483646;
      overflow: hidden;
    `;
    document.body.appendChild(rippleContainer);

    // Add animation styles
    const style = document.createElement('style');
    style.id = 'demo-styles';
    style.textContent = `
      @keyframes demo-ripple {
        0% { transform: scale(0.5); opacity: 1; }
        100% { transform: scale(3); opacity: 0; }
      }
      @keyframes demo-highlight {
        0% { outline-color: #2ecc71; }
        50% { outline-color: #27ae60; }
        100% { outline-color: transparent; }
      }
      .demo-highlighted {
        outline: 3px solid #2ecc71 !important;
        outline-offset: 2px !important;
        animation: demo-highlight 1s ease-out forwards !important;
      }
    `;
    document.head.appendChild(style);

    // Track mouse movement
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });

    // Click visualization
    document.addEventListener('mousedown', (e) => {
      // Cursor press effect
      cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
      cursor.style.backgroundColor = 'rgba(231, 76, 60, 0.5)';
    });

    document.addEventListener('mouseup', (e) => {
      // Cursor release effect
      cursor.style.transform = 'translate(-50%, -50%) scale(1)';
      cursor.style.backgroundColor = 'rgba(231, 76, 60, 0.2)';
    });

    document.addEventListener('click', (e) => {
      // Create expanding ripple at click location
      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        width: 30px;
        height: 30px;
        border: 2px solid #e74c3c;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: demo-ripple 0.6s ease-out forwards;
        pointer-events: none;
      `;
      rippleContainer.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);

      // Highlight clicked element
      const target = e.target as HTMLElement;
      if (target && target !== document.body) {
        target.classList.add('demo-highlighted');
        setTimeout(() => target.classList.remove('demo-highlighted'), 1000);
      }
    }, true);
  });

  // Re-inject on navigation
  page.on('load', async () => {
    await page.addInitScript(() => {
      // Script will re-run on new page loads
    });
  });
}

// ============================================
// HUMAN-PACED INTERACTIONS
// ============================================

/**
 * Types text character by character at human-readable speed.
 *
 * @param page - Playwright page
 * @param selector - Element selector or locator
 * @param text - Text to type
 * @param options - Typing options
 */
export async function typeSlowly(
  page: Page,
  selector: string | Locator,
  text: string,
  options: {
    delayPerChar?: number;
    clearFirst?: boolean;
    pauseAfter?: number;
  } = {}
): Promise<void> {
  const {
    delayPerChar = 100,
    clearFirst = false,
    pauseAfter = 500,
  } = options;

  const locator = typeof selector === 'string' ? page.locator(selector) : selector;

  await locator.click();

  if (clearFirst) {
    await locator.clear();
    await page.waitForTimeout(200);
  }

  // Type character by character
  for (const char of text) {
    await locator.pressSequentially(char, { delay: delayPerChar });
  }

  await page.waitForTimeout(pauseAfter);
}

/**
 * Pauses execution for viewer reading time.
 * Use after content appears that viewers need to read.
 *
 * @param page - Playwright page
 * @param seconds - Seconds to pause (default: 3)
 * @param reason - Optional reason for logging
 */
export async function pauseForReading(
  page: Page,
  seconds: number = 3,
  reason?: string
): Promise<void> {
  if (reason) {
    console.log(`⏸️  Pausing ${seconds}s: ${reason}`);
  }
  await page.waitForTimeout(seconds * 1000);
}

/**
 * Moves mouse smoothly to element center before clicking.
 * Creates natural-looking cursor movement.
 *
 * @param page - Playwright page
 * @param selector - Element to click
 * @param options - Click options
 */
export async function smoothClick(
  page: Page,
  selector: string | Locator,
  options: {
    steps?: number;
    pauseBefore?: number;
    pauseAfter?: number;
  } = {}
): Promise<void> {
  const {
    steps = 25,
    pauseBefore = 200,
    pauseAfter = 500,
  } = options;

  const locator = typeof selector === 'string' ? page.locator(selector) : selector;

  // Ensure element is visible
  await locator.waitFor({ state: 'visible' });

  const box = await locator.boundingBox();

  if (box) {
    // Calculate center point
    const targetX = box.x + box.width / 2;
    const targetY = box.y + box.height / 2;

    // Smooth mouse movement with interpolation
    await page.mouse.move(targetX, targetY, { steps });

    // Brief pause to let viewer see cursor position
    await page.waitForTimeout(pauseBefore);

    // Perform click
    await locator.click();

    // Pause after click for visual feedback
    await page.waitForTimeout(pauseAfter);
  } else {
    // Fallback to regular click if bounding box unavailable
    await locator.click();
    await page.waitForTimeout(pauseAfter);
  }
}

/**
 * Scrolls smoothly to bring element into view.
 *
 * @param page - Playwright page
 * @param selector - Element to scroll to
 * @param pauseAfter - Pause after scrolling (default: 800ms)
 */
export async function smoothScrollTo(
  page: Page,
  selector: string | Locator,
  pauseAfter: number = 800
): Promise<void> {
  const locator = typeof selector === 'string' ? page.locator(selector) : selector;

  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(pauseAfter);
}

// ============================================
// AI INTERACTION HELPERS
// ============================================

/**
 * Waits for AI response to appear and provides reading time.
 * Handles loading indicators and dynamic content.
 *
 * @param page - Playwright page
 * @param responseSelector - Selector for AI response container
 * @param options - Wait options
 */
export async function waitForAIResponse(
  page: Page,
  responseSelector: string,
  options: {
    readingTimeSeconds?: number;
    loadingSelector?: string;
    timeout?: number;
  } = {}
): Promise<void> {
  const {
    readingTimeSeconds = 5,
    loadingSelector = '[data-loading="true"], .loading, .spinner, [aria-busy="true"]',
    timeout = 60000,
  } = options;

  // Wait for response container to appear
  await page.locator(responseSelector).waitFor({
    state: 'visible',
    timeout
  });

  // Wait for loading indicators to disappear
  const loadingIndicator = page.locator(loadingSelector);
  const loadingCount = await loadingIndicator.count();

  if (loadingCount > 0) {
    await loadingIndicator.first().waitFor({
      state: 'hidden',
      timeout
    });
  }

  // Additional wait for streaming content to complete
  await page.waitForTimeout(1000);

  // Reading time for viewer comprehension
  await pauseForReading(page, readingTimeSeconds, 'Reading AI response');
}

/**
 * Sends a message in a chat interface with human pacing.
 *
 * @param page - Playwright page
 * @param inputSelector - Chat input selector
 * @param sendSelector - Send button selector
 * @param message - Message to send
 * @param responseSelector - AI response selector to wait for
 */
export async function sendChatMessage(
  page: Page,
  inputSelector: string,
  sendSelector: string,
  message: string,
  responseSelector: string
): Promise<void> {
  // Click input field
  await smoothClick(page, inputSelector);

  // Type message slowly
  await typeSlowly(page, inputSelector, message, { delayPerChar: 80 });

  // Pause to let viewer read the message
  await pauseForReading(page, 2, 'Reviewing message before send');

  // Click send
  await smoothClick(page, sendSelector);

  // Wait for and read response
  await waitForAIResponse(page, responseSelector, { readingTimeSeconds: 8 });
}

// ============================================
// NAVIGATION HELPERS
// ============================================

/**
 * Navigates to URL with appropriate pauses for viewer orientation.
 *
 * @param page - Playwright page
 * @param url - URL to navigate to
 * @param options - Navigation options
 */
export async function navigateWithPause(
  page: Page,
  url: string,
  options: {
    waitForSelector?: string;
    orientationPause?: number;
  } = {}
): Promise<void> {
  const {
    waitForSelector,
    orientationPause = 2000,
  } = options;

  await page.goto(url);

  if (waitForSelector) {
    await page.locator(waitForSelector).waitFor({ state: 'visible' });
  }

  await page.waitForTimeout(orientationPause);
}

// ============================================
// FORM INTERACTION HELPERS
// ============================================

/**
 * Fills a form field with demo pacing.
 *
 * @param page - Playwright page
 * @param selector - Input selector
 * @param value - Value to enter
 * @param label - Field label for logging
 */
export async function fillFieldSlowly(
  page: Page,
  selector: string,
  value: string,
  label?: string
): Promise<void> {
  if (label) {
    console.log(`📝 Filling: ${label}`);
  }

  await smoothClick(page, selector, { pauseAfter: 300 });
  await typeSlowly(page, selector, value, {
    delayPerChar: 100,
    clearFirst: true,
    pauseAfter: 500
  });
}

/**
 * Selects a dropdown option with demo pacing.
 *
 * @param page - Playwright page
 * @param selector - Select element selector
 * @param value - Option value to select
 */
export async function selectOptionSlowly(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  await smoothClick(page, selector);
  await page.waitForTimeout(300);
  await page.locator(selector).selectOption(value);
  await page.waitForTimeout(500);
}

/**
 * Checks/unchecks a checkbox with demo pacing.
 *
 * @param page - Playwright page
 * @param selector - Checkbox selector
 * @param checked - Whether to check or uncheck
 */
export async function toggleCheckbox(
  page: Page,
  selector: string,
  checked: boolean = true
): Promise<void> {
  const checkbox = page.locator(selector);
  const isChecked = await checkbox.isChecked();

  if (isChecked !== checked) {
    await smoothClick(page, selector);
  }

  await page.waitForTimeout(300);
}
```

### 2.3 Test Fixture Setup (`e2e/fixtures/demo.fixture.ts`)

```typescript
import { test as base, Page } from '@playwright/test';
import { enableDemoMode } from '../utils/demo-helpers';

// Extend base test with demo mode auto-initialization
export const test = base.extend<{ demoPage: Page }>({
  demoPage: async ({ page }, use) => {
    // Enable demo mode (cursor, click highlighting)
    await enableDemoMode(page);

    // Pass the configured page to tests
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

---

## 3. Test Structure by Persona

### 3.1 Directory Structure

```
e2e/
├── demo-tests/
│   ├── admin/
│   │   └── quick-start.spec.ts
│   ├── law-firm/
│   │   ├── paralegal-quick-start.spec.ts
│   │   └── attorney-quick-start.spec.ts
│   ├── defender/
│   │   └── quick-start.spec.ts
│   └── debtor/
│       └── quick-start.spec.ts
├── fixtures/
│   └── demo.fixture.ts
├── utils/
│   └── demo-helpers.ts
├── demo-results/          # Video output directory
└── demo-report/           # HTML report output
```

### 3.2 Example Test: Debtor Quick-Start

```typescript
// e2e/demo-tests/debtor/quick-start.spec.ts

import { test, expect } from '../../fixtures/demo.fixture';
import {
  pauseForReading,
  smoothClick,
  typeSlowly,
  fillFieldSlowly,
  navigateWithPause,
  sendChatMessage,
  smoothScrollTo,
} from '../../utils/demo-helpers';

test.describe('Debtor Quick-Start Guide', () => {

  test('Complete debtor onboarding and dashboard exploration', async ({ demoPage: page }) => {
    // Mark as slow test
    test.slow();

    // ========================================
    // STEP 1: Use Invitation Link
    // ========================================
    console.log('📍 Step 1: Using invitation link');

    await navigateWithPause(page, '/invite/demo-debtor-token', {
      waitForSelector: '[data-testid="verify-identity-form"]',
      orientationPause: 2000,
    });

    // ========================================
    // STEP 2: Verify Identity
    // ========================================
    console.log('📍 Step 2: Verifying identity');

    await fillFieldSlowly(
      page,
      '[data-testid="ssn-last-4"]',
      '1234',
      'Last 4 SSN'
    );

    await smoothClick(page, '[data-testid="verify-button"]');

    // Wait for verification success
    await expect(page.locator('[data-testid="verification-success"]'))
      .toBeVisible({ timeout: 10000 });
    await pauseForReading(page, 2, 'Verification success message');

    // ========================================
    // STEP 3: Create Account
    // ========================================
    console.log('📍 Step 3: Creating account');

    await fillFieldSlowly(page, '[data-testid="email"]', 'demo@example.com', 'Email');
    await fillFieldSlowly(page, '[data-testid="password"]', 'SecurePass123!', 'Password');
    await fillFieldSlowly(page, '[data-testid="confirm-password"]', 'SecurePass123!', 'Confirm Password');

    await smoothClick(page, '[data-testid="create-account-button"]');

    // Wait for account creation
    await page.waitForURL('**/debtor/dashboard**', { timeout: 15000 });
    await pauseForReading(page, 3, 'Dashboard loaded');

    // ========================================
    // STEP 4: View Dashboard Overview
    // ========================================
    console.log('📍 Step 4: Viewing dashboard');

    // Amount Owed Card
    await smoothScrollTo(page, '[data-testid="amount-owed-card"]');
    await pauseForReading(page, 4, 'Reading amount owed breakdown');

    // Timeline Card
    await smoothScrollTo(page, '[data-testid="timeline-card"]');
    await pauseForReading(page, 3, 'Reading timeline information');

    // Creditor Info
    await smoothScrollTo(page, '[data-testid="creditor-info-card"]');
    await pauseForReading(page, 3, 'Reading creditor information');

    // ========================================
    // STEP 5: View Plain English Version
    // ========================================
    console.log('📍 Step 5: Viewing plain English version');

    await smoothClick(page, '[data-testid="plain-english-toggle"]');

    await expect(page.locator('[data-testid="plain-english-content"]'))
      .toBeVisible({ timeout: 5000 });

    await pauseForReading(page, 6, 'Reading simplified demand letter');

    // ========================================
    // STEP 6: Explore Options
    // ========================================
    console.log('📍 Step 6: Exploring options');

    await smoothScrollTo(page, '[data-testid="options-panel"]');
    await pauseForReading(page, 2);

    // Hover over each option
    const options = ['pay', 'dispute', 'negotiate', 'get-help'];
    for (const option of options) {
      await smoothClick(page, `[data-testid="option-${option}"]`, { pauseAfter: 1500 });
    }

    // ========================================
    // STEP 7: Use AI Assistant (if available)
    // ========================================
    console.log('📍 Step 7: Using AI assistant');

    const chatExists = await page.locator('[data-testid="chat-input"]').count() > 0;

    if (chatExists) {
      await sendChatMessage(
        page,
        '[data-testid="chat-input"]',
        '[data-testid="send-message"]',
        'What are my options if I cannot pay the full amount?',
        '[data-testid="ai-response"]'
      );
    }

    // ========================================
    // FINAL: Summary pause
    // ========================================
    console.log('✅ Debtor quick-start demo complete');
    await pauseForReading(page, 3, 'Final overview');
  });
});
```

### 3.3 Example Test: Admin Quick-Start

```typescript
// e2e/demo-tests/admin/quick-start.spec.ts

import { test, expect } from '../../fixtures/demo.fixture';
import {
  pauseForReading,
  smoothClick,
  fillFieldSlowly,
  navigateWithPause,
  selectOptionSlowly,
  smoothScrollTo,
} from '../../utils/demo-helpers';

test.describe('Admin Quick-Start Guide', () => {

  test('Invite a public defender workflow', async ({ demoPage: page }) => {
    test.slow();

    // ========================================
    // Login as Admin
    // ========================================
    console.log('📍 Logging in as admin');

    await navigateWithPause(page, '/login', {
      waitForSelector: '[data-testid="login-form"]',
    });

    await fillFieldSlowly(page, '[data-testid="email"]', 'admin@partner.com', 'Email');
    await fillFieldSlowly(page, '[data-testid="password"]', 'AdminPass123!', 'Password');
    await smoothClick(page, '[data-testid="login-button"]');

    await page.waitForURL('**/admin/dashboard**');
    await pauseForReading(page, 2, 'Admin dashboard');

    // ========================================
    // Navigate to Defender Invitations
    // ========================================
    console.log('📍 Opening defender invitations');

    await smoothClick(page, '[data-testid="nav-invitations"]');
    await pauseForReading(page, 2);

    // ========================================
    // Create New Invitation
    // ========================================
    console.log('📍 Creating new invitation');

    await smoothClick(page, '[data-testid="new-invitation-button"]');

    await expect(page.locator('[data-testid="invitation-form"]'))
      .toBeVisible({ timeout: 5000 });
    await pauseForReading(page, 1);

    // Fill invitation form
    await fillFieldSlowly(page, '[data-testid="defender-email"]', 'newdefender@example.com', 'Defender Email');
    await fillFieldSlowly(page, '[data-testid="defender-name"]', 'Jane Defender', 'Name');
    await fillFieldSlowly(page, '[data-testid="organization"]', 'Legal Aid Society', 'Organization');

    await pauseForReading(page, 2, 'Review form before sending');

    // Send invitation
    await smoothClick(page, '[data-testid="send-invitation-button"]');

    // Success confirmation
    await expect(page.locator('[data-testid="invitation-success"]'))
      .toBeVisible({ timeout: 5000 });
    await pauseForReading(page, 3, 'Invitation sent successfully');

    // ========================================
    // View Invitation in List
    // ========================================
    console.log('📍 Viewing invitation list');

    await smoothScrollTo(page, '[data-testid="invitations-table"]');
    await pauseForReading(page, 3, 'Reviewing invitations table');

    console.log('✅ Admin quick-start demo complete');
  });
});
```

---

## 4. Recommended Timing Values

### Interaction Pacing Matrix

| Action Type | slowMo Base | Additional Pause | Total Perceived Delay |
|-------------|-------------|------------------|----------------------|
| Button click | 500ms | 500ms after | ~1s |
| Text input (per char) | 500ms | 80-100ms typing | ~600ms/char |
| Dropdown select | 500ms | 300ms after | ~800ms |
| Page navigation | 500ms | 2000ms orientation | ~2.5s |
| Content reading | 500ms | 3000-5000ms | ~3.5-5.5s |
| AI response reading | 500ms | 5000-10000ms | ~5.5-10.5s |
| Form submission | 500ms | 1000ms | ~1.5s |
| Scroll to element | 500ms | 800ms | ~1.3s |

### Reading Time Guidelines

| Content Type | Recommended Pause |
|--------------|-------------------|
| Single line message | 2 seconds |
| Paragraph (3-5 lines) | 4 seconds |
| Form with multiple fields | 3 seconds |
| Dashboard overview | 4-5 seconds |
| Detailed document | 6-8 seconds |
| AI chat response | 8-10 seconds |
| Error message | 3 seconds |
| Success confirmation | 2-3 seconds |

---

## 5. Running Demo Tests

### Command Line Options

```bash
# Run all demo tests with video recording
npx playwright test --project=demo-chromium

# Run specific persona's demo
npx playwright test e2e/demo-tests/debtor/ --project=demo-chromium

# Run in headed mode with UI (for monitoring)
npx playwright test --project=demo-chromium --ui

# Generate HTML report
npx playwright show-report e2e/demo-report
```

### NPM Scripts (add to package.json)

```json
{
  "scripts": {
    "test:demo": "playwright test --project=demo-chromium",
    "test:demo:admin": "playwright test e2e/demo-tests/admin/ --project=demo-chromium",
    "test:demo:paralegal": "playwright test e2e/demo-tests/law-firm/paralegal --project=demo-chromium",
    "test:demo:attorney": "playwright test e2e/demo-tests/law-firm/attorney --project=demo-chromium",
    "test:demo:defender": "playwright test e2e/demo-tests/defender/ --project=demo-chromium",
    "test:demo:debtor": "playwright test e2e/demo-tests/debtor/ --project=demo-chromium",
    "test:demo:report": "playwright show-report e2e/demo-report"
  }
}
```

---

## 6. Video Post-Processing

### Converting WebM to MP4

```bash
# Single file conversion
ffmpeg -i e2e/demo-results/video.webm -c:v libx264 -crf 23 -preset medium demo.mp4

# Batch conversion script
for f in e2e/demo-results/**/*.webm; do
  ffmpeg -i "$f" -c:v libx264 -crf 23 "${f%.webm}.mp4"
done
```

### Adding Intro/Outro

```bash
# Concatenate intro, demo, and outro
ffmpeg -i intro.mp4 -i demo.mp4 -i outro.mp4 \
  -filter_complex "[0:v][1:v][2:v]concat=n=3:v=1[outv]" \
  -map "[outv]" final-demo.mp4
```

---

## 7. Architecture Decision Record (ADR)

### ADR-001: Playwright Configuration for Demo Video Generation

**Status:** Accepted

**Context:**
The Partner platform requires E2E tests that verify quick-start guide functionality while generating professional video documentation. Videos must be human-paced so viewers can follow along and understand each action.

**Decision Drivers:**
- Need for visible cursor in recordings
- Requirement for human-readable interaction speed
- Video quality requirements (1080p)
- Maintainability separate from CI/CD tests

**Considered Options:**
1. Native Playwright with custom utilities (selected)
2. playwright-fluent library
3. Cypress with video recording
4. Manual screen recording

**Decision:**
Use native Playwright with custom demo utilities for cursor visualization, click highlighting, and pacing control.

**Consequences:**

**Positive:**
- Full control over interaction pacing
- No external dependencies beyond Playwright
- Consistent with existing test infrastructure plans
- Custom utilities are reusable across all persona tests

**Negative:**
- Requires initial setup effort for demo utilities
- Cursor visualization is injected (not native)
- Tests run slower than standard E2E tests

**Neutral:**
- Video format is WebM (requires conversion for some platforms)
- Separate configuration from CI/CD tests

**Implementation Notes:**
- Demo tests should be in separate directory from CI/CD tests
- Use `test.slow()` to extend timeouts
- Custom utilities must be injected on every page load
- Consider creating test data fixtures for consistent demo scenarios

---

## 8. References and Sources

### Official Documentation
- [Playwright Configuration](https://playwright.dev/docs/test-configuration)
- [Playwright Videos](https://playwright.dev/docs/videos)
- [Playwright Test Use Options](https://playwright.dev/docs/test-use-options)
- [Playwright Auto-waiting](https://playwright.dev/docs/actionability)
- [Playwright Mouse API](https://playwright.dev/docs/api/class-mouse)
- [Playwright Timeouts](https://playwright.dev/docs/test-timeouts)

### Community Resources
- [Understanding slowMo and test.slow()](https://medium.com/@semihkasimoglu/understanding-playwrights-test-slow-and-slowmo-option-a-guide-for-efficient-test-management-8caf3a5183ba)
- [Waits and Timeouts - Checkly](https://www.checklyhq.com/docs/learn/playwright/waits-and-timeouts/)
- [Mouse Helper Feature Request](https://github.com/microsoft/playwright/issues/1374)
- [Click Highlighting Discussion](https://github.com/microsoft/playwright/issues/27268)
- [playwright-fluent GitHub](https://github.com/hdorgeval/playwright-fluent)

### Tutorials and Guides
- [Playwright E2E Testing Guide 2025](https://www.deviqa.com/blog/guide-to-playwright-end-to-end-testing-in-2025/)
- [Playwright Features 2025](https://thinksys.com/qa-testing/playwright-features/)
- [How to Run Tests in SloMo](https://opsmatters.com/videos/how-run-your-playwright-end-end-tests-slomo)

---

## Document Information

**Workflow:** BMad Research Workflow - Technical Research v2.0
**Generated:** 2025-11-27
**Research Type:** Technical/Architecture Research
**Total Sources Cited:** 15+

---

*This technical research report was generated using the BMad Method Research Workflow, combining systematic technology evaluation frameworks with real-time 2025 research and analysis.*
