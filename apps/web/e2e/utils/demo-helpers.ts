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
    document.addEventListener('mousedown', () => {
      // Cursor press effect
      cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
      cursor.style.backgroundColor = 'rgba(231, 76, 60, 0.5)';
    });

    document.addEventListener('mouseup', () => {
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
    console.log(`Pausing ${seconds}s: ${reason}`);
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
    console.log(`Filling: ${label}`);
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

// ============================================
// FILE UPLOAD HELPERS
// ============================================

/**
 * Uploads a file with demo pacing and visual feedback.
 *
 * @param page - Playwright page
 * @param selector - File input selector
 * @param filePath - Path to file to upload
 * @param label - Optional label for logging
 */
export async function uploadFile(
  page: Page,
  selector: string,
  filePath: string,
  label?: string
): Promise<void> {
  if (label) {
    console.log(`Uploading: ${label}`);
  }

  const fileInput = page.locator(selector);
  await fileInput.setInputFiles(filePath);
  await page.waitForTimeout(1000);
  await pauseForReading(page, 2, 'File uploaded');
}

// ============================================
// SIGNATURE HELPERS
// ============================================

/**
 * Draws a signature on a canvas element with demo pacing.
 *
 * @param page - Playwright page
 * @param canvasSelector - Canvas element selector
 */
export async function drawSignature(
  page: Page,
  canvasSelector: string
): Promise<void> {
  console.log('Drawing signature');

  const canvas = page.locator(canvasSelector);
  await canvas.waitFor({ state: 'visible' });

  const box = await canvas.boundingBox();
  if (!box) return;

  // Move to starting position (left side of canvas)
  const startX = box.x + box.width * 0.15;
  const startY = box.y + box.height * 0.6;

  await page.mouse.move(startX, startY, { steps: 10 });
  await page.waitForTimeout(300);

  // Draw a simple signature path
  await page.mouse.down();

  // First stroke - main name
  await page.mouse.move(startX + box.width * 0.25, startY - box.height * 0.2, { steps: 15 });
  await page.mouse.move(startX + box.width * 0.35, startY + box.height * 0.1, { steps: 15 });
  await page.mouse.move(startX + box.width * 0.5, startY - box.height * 0.15, { steps: 15 });
  await page.mouse.move(startX + box.width * 0.65, startY, { steps: 15 });

  await page.mouse.up();
  await page.waitForTimeout(500);

  await pauseForReading(page, 2, 'Signature complete');
}

// ============================================
// TABLE AND LIST HELPERS
// ============================================

/**
 * Highlights and reads through table rows with demo pacing.
 *
 * @param page - Playwright page
 * @param tableSelector - Table selector
 * @param maxRows - Maximum rows to highlight (default: 5)
 */
export async function scanTable(
  page: Page,
  tableSelector: string,
  maxRows: number = 5
): Promise<void> {
  const rows = page.locator(`${tableSelector} tbody tr`);
  const count = await rows.count();
  const rowsToScan = Math.min(count, maxRows);

  for (let i = 0; i < rowsToScan; i++) {
    const row = rows.nth(i);
    await row.scrollIntoViewIfNeeded();
    await row.hover();
    await page.waitForTimeout(800);
  }

  await pauseForReading(page, 1);
}

// ============================================
// MODAL AND DIALOG HELPERS
// ============================================

/**
 * Waits for a modal to appear and gives reading time.
 *
 * @param page - Playwright page
 * @param modalSelector - Modal selector
 * @param readingTime - Time to read modal content
 */
export async function waitForModal(
  page: Page,
  modalSelector: string,
  readingTime: number = 3
): Promise<void> {
  await page.locator(modalSelector).waitFor({ state: 'visible' });
  await pauseForReading(page, readingTime, 'Reading modal content');
}

/**
 * Closes a modal with demo pacing.
 *
 * @param page - Playwright page
 * @param closeButtonSelector - Close button selector
 */
export async function closeModal(
  page: Page,
  closeButtonSelector: string
): Promise<void> {
  await smoothClick(page, closeButtonSelector);
  await page.waitForTimeout(500);
}
