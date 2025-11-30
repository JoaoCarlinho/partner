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
