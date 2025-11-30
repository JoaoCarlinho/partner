import { defineConfig, devices } from '@playwright/test';

// Check if testing against a remote URL (not localhost)
const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const isRemote = !baseURL.includes('localhost') && !baseURL.includes('127.0.0.1');

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
    baseURL,

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

  // Web server configuration - only start local server when not testing remote
  ...(isRemote ? {} : {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  }),
});
