/**
 * Seed Handler - Creates test users for development/testing
 *
 * This endpoint allows seeding the database with test users via HTTP request.
 * Protected by a simple secret key check.
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';
import { prisma } from '../lib/prisma.js';
import { logger } from '../middleware/logger.js';

const router = Router();

// Function to sync database schema using prisma db push
async function syncDatabaseSchema(): Promise<string> {
  try {
    logger.info('Running Prisma db push to sync schema...');
    logger.info('CWD: ' + process.cwd());

    // Check if prisma schema exists
    const fs = await import('fs');
    const schemaPath = process.cwd() + '/prisma/schema.prisma';
    const schemaExists = fs.existsSync(schemaPath);
    logger.info('Schema exists at ' + schemaPath + ': ' + schemaExists);

    // Use --force-reset to drop all data and recreate tables
    // This is safe since we're seeding fresh test data anyway
    const output = execSync('npx prisma db push --force-reset --accept-data-loss 2>&1', {
      encoding: 'utf8',
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    logger.info('Database schema synced', { output });
    return output;
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    const errorDetails = {
      message: execError.message,
      stdout: execError.stdout,
      stderr: execError.stderr,
    };
    logger.error('Schema sync failed', errorDetails);
    throw new Error(`Schema sync failed: ${JSON.stringify(errorDetails)}`);
  }
}

// Standard test password for all users
const TEST_PASSWORD = 'TestPassword123!';
const BCRYPT_ROUNDS = 12;

// Simple secret for seed endpoint (should be set in environment)
const SEED_SECRET = process.env.SEED_SECRET || 'seed-demo-secret-2024';

interface TestUser {
  email: string;
  role: 'FIRM_ADMIN' | 'ATTORNEY' | 'PARALEGAL' | 'DEBTOR' | 'PUBLIC_DEFENDER';
  description: string;
}

const testUsers: TestUser[] = [
  { email: 'admin@lawfirm.com', role: 'FIRM_ADMIN', description: 'Admin user with full access' },
  { email: 'attorney@lawfirm.com', role: 'ATTORNEY', description: 'Attorney for letter approval' },
  { email: 'paralegal@lawfirm.com', role: 'PARALEGAL', description: 'Paralegal for letter editing' },
];

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

router.post('/', async (req: Request, res: Response) => {
  try {
    // Check secret
    const { secret } = req.body;
    if (secret !== SEED_SECRET) {
      logger.warn('Invalid seed secret provided');
      return res.status(403).json({ error: 'Invalid secret' });
    }

    logger.info('Starting database seed...');

    // Sync database schema first to ensure tables exist
    // This will throw an error if it fails - we want to see the error
    const schemaOutput = await syncDatabaseSchema();
    logger.info('Database schema synced successfully', { schemaOutput });

    const passwordHash = await hashPassword(TEST_PASSWORD);
    const results: string[] = [];

    // 1. Create or find test organization
    const organization = await prisma.organization.upsert({
      where: { id: 'test-org-demo-001' },
      update: {},
      create: {
        id: 'test-org-demo-001',
        name: 'Demo Law Firm',
        settings: {
          branding: {
            primaryColor: '#1e40af',
            companyName: 'Demo Law Firm',
          },
          features: {
            aiAssistant: true,
            paraphrasedLetters: true,
          },
        },
      },
    });
    results.push(`Organization: ${organization.name} (${organization.id})`);

    // 2. Create staff users (FIRM_ADMIN, ATTORNEY, PARALEGAL)
    for (const user of testUsers) {
      const created = await prisma.user.upsert({
        where: { email: user.email },
        update: {
          passwordHash,
          emailVerified: true,
          organizationId: organization.id,
          role: user.role,
        },
        create: {
          email: user.email,
          passwordHash,
          role: user.role,
          emailVerified: true,
          organizationId: organization.id,
        },
      });
      results.push(`${user.role}: ${user.email} (${created.id})`);
    }

    // 3. Create a test case for debtor
    const ssnHash = await bcrypt.hash('1234', BCRYPT_ROUNDS);
    const testCase = await prisma.case.upsert({
      where: { id: 'test-case-demo-001' },
      update: {},
      create: {
        id: 'test-case-demo-001',
        organizationId: organization.id,
        status: 'ACTIVE',
        debtAmount: 5000.00,
        creditorName: 'Demo Credit Services',
        debtorName: 'John Doe',
        debtorEmail: 'john.debtor@example.com',
        debtorSsnHash: ssnHash,
        debtorDob: new Date('1985-06-15'),
        accountNumber: 'ACCT-123456',
        referenceNumber: 'REF-2024-001',
        metadata: {
          originalCreditor: 'Demo Bank',
          accountOpenDate: '2020-01-15',
          lastPaymentDate: '2024-01-01',
        },
      },
    });
    results.push(`Case: ${testCase.creditorName} - $${testCase.debtAmount} (${testCase.id})`);

    // 4. Create a demand letter with invitation token
    const invitationToken = 'debtor-demo-token';
    const demandLetter = await prisma.demandLetter.upsert({
      where: { id: 'test-letter-demo-001' },
      update: {
        invitationToken,
        invitationExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      create: {
        id: 'test-letter-demo-001',
        organizationId: organization.id,
        caseId: testCase.id,
        content: 'DEMAND LETTER\n\nTo: John Doe\nRe: Account #ACCT-123456\n\nDear John Doe,\n\nThis letter is to inform you that our client, Demo Credit Services, has retained Demo Law Firm to collect a debt owed in the amount of $5,000.00.\n\nSincerely,\nDemo Law Firm',
        paraphrasedContent: 'WHAT THIS LETTER MEANS\n\nHi John,\n\nA company called Demo Credit Services has asked us (Demo Law Firm) to help collect money they say you owe them.\n\nTHE AMOUNT: $5,000.00',
        status: 'SENT',
        invitationToken,
        invitationExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        invitationUsageLimit: 10,
        invitationCreatedAt: new Date(),
        sentAt: new Date(),
      },
    });
    results.push(`Demand Letter: ${demandLetter.id} (token: ${invitationToken})`);

    // 5. Create debtor user
    const debtorUser = await prisma.user.upsert({
      where: { email: 'john.debtor@example.com' },
      update: {
        passwordHash,
        emailVerified: true,
        organizationId: organization.id,
        role: 'DEBTOR',
      },
      create: {
        email: 'john.debtor@example.com',
        passwordHash,
        role: 'DEBTOR',
        emailVerified: true,
        organizationId: organization.id,
      },
    });
    results.push(`DEBTOR: john.debtor@example.com (${debtorUser.id})`);

    // Update case with debtor user ID
    await prisma.case.update({
      where: { id: testCase.id },
      data: { debtorUserId: debtorUser.id },
    });

    // 6. Create debtor profile
    const debtorProfile = await prisma.debtorProfile.upsert({
      where: { userId: debtorUser.id },
      update: {},
      create: {
        userId: debtorUser.id,
        caseId: testCase.id,
        invitationTokenUsed: invitationToken,
        onboardingCompleted: true,
        welcomeShownAt: new Date(),
        termsAcceptedAt: new Date(),
        termsAcceptedIp: '127.0.0.1',
        termsVersion: '1.0',
      },
    });
    results.push(`Debtor Profile: ${debtorProfile.id}`);

    // 7. Create defender organization and user
    const defenderOrg = await prisma.organization.upsert({
      where: { id: 'test-org-defender-001' },
      update: {},
      create: {
        id: 'test-org-defender-001',
        name: 'Legal Aid Society',
        settings: {
          type: 'defender',
          features: {
            caseAssignment: true,
          },
        },
      },
    });

    const defenderUser = await prisma.user.upsert({
      where: { email: 'defender@legalaid.org' },
      update: {
        passwordHash,
        emailVerified: true,
        organizationId: defenderOrg.id,
        role: 'PUBLIC_DEFENDER',
      },
      create: {
        email: 'defender@legalaid.org',
        passwordHash,
        role: 'PUBLIC_DEFENDER',
        emailVerified: true,
        organizationId: defenderOrg.id,
      },
    });
    results.push(`PUBLIC_DEFENDER: defender@legalaid.org (${defenderUser.id})`);

    logger.info('Seed completed successfully', { results });

    res.json({
      success: true,
      message: 'Database seeded successfully',
      results,
      credentials: {
        password: TEST_PASSWORD,
        users: [
          'admin@lawfirm.com (FIRM_ADMIN)',
          'attorney@lawfirm.com (ATTORNEY)',
          'paralegal@lawfirm.com (PARALEGAL)',
          'john.debtor@example.com (DEBTOR)',
          'defender@legalaid.org (PUBLIC_DEFENDER)',
        ],
      },
    });
  } catch (error) {
    logger.error('Seed failed', { error });
    res.status(500).json({
      error: 'Seed failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
