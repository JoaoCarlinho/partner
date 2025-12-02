/**
 * Seed Script for Test Users
 *
 * Creates test users for all roles in the AWS environment:
 * - FIRM_ADMIN (admin@lawfirm.com)
 * - ATTORNEY (attorney@lawfirm.com)
 * - PARALEGAL (paralegal@lawfirm.com)
 * - DEBTOR (john.debtor@example.com)
 * - PUBLIC_DEFENDER (defender@legalaid.org)
 *
 * All test users use the same password: TestPassword123!
 *
 * Usage:
 *   DATABASE_URL=<your-aws-db-url> npm run seed
 */

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Standard test password for all users
const TEST_PASSWORD = 'TestPassword123!';
const BCRYPT_ROUNDS = 12;

interface TestUser {
  email: string;
  role: Role;
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

async function main() {
  console.log('🌱 Starting seed...\n');

  const passwordHash = await hashPassword(TEST_PASSWORD);
  console.log('✓ Password hashed\n');

  // 1. Create or find test organization
  console.log('Creating organization...');
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
  console.log(`✓ Organization: ${organization.name} (${organization.id})\n`);

  // 2. Create staff users (FIRM_ADMIN, ATTORNEY, PARALEGAL)
  console.log('Creating staff users...');
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
    console.log(`✓ ${user.role}: ${user.email} (${created.id})`);
  }
  console.log('');

  // 3. Create a test case for debtor
  console.log('Creating test case...');
  const ssnHash = await bcrypt.hash('1234', BCRYPT_ROUNDS); // Last 4 SSN: 1234
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
  console.log(`✓ Case: ${testCase.creditorName} - $${testCase.debtAmount} (${testCase.id})\n`);

  // 4. Create a demand letter with invitation token
  console.log('Creating demand letter...');
  const invitationToken = 'debtor-demo-token';
  const demandLetter = await prisma.demandLetter.upsert({
    where: { id: 'test-letter-demo-001' },
    update: {
      invitationToken,
      invitationExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
    create: {
      id: 'test-letter-demo-001',
      organizationId: organization.id,
      caseId: testCase.id,
      content: `
DEMAND LETTER

To: John Doe
Re: Account #ACCT-123456

Dear John Doe,

This letter is to inform you that our client, Demo Credit Services, has retained
Demo Law Firm to collect a debt owed in the amount of $5,000.00.

This debt originated from your account with Demo Bank (Account #ACCT-123456).

You have the right to dispute this debt within 30 days of receiving this letter.
If you do not dispute the debt, it will be assumed valid.

Please contact our office to discuss payment options.

Sincerely,
Demo Law Firm
      `.trim(),
      paraphrasedContent: `
WHAT THIS LETTER MEANS

Hi John,

A company called Demo Credit Services has asked us (Demo Law Firm) to help
collect money they say you owe them.

THE AMOUNT: $5,000.00

WHERE THIS CAME FROM:
This is for an account you had with Demo Bank (Account #ACCT-123456).

YOUR RIGHTS:
- You have 30 days to tell us if you think this is wrong
- If you don't say anything in 30 days, the law says you agree you owe this money

WHAT YOU CAN DO:
1. Pay the full amount
2. Set up a payment plan
3. Tell us why you think this is wrong

Want to talk? We're here to help find a solution.
      `.trim(),
      status: 'SENT',
      invitationToken,
      invitationExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      invitationUsageLimit: 10,
      invitationCreatedAt: new Date(),
      sentAt: new Date(),
    },
  });
  console.log(`✓ Demand Letter: ${demandLetter.id} (token: ${invitationToken})\n`);

  // 5. Create debtor user
  console.log('Creating debtor user...');
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
  console.log(`✓ DEBTOR: john.debtor@example.com (${debtorUser.id})`);

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
  console.log(`✓ Debtor Profile: ${debtorProfile.id}\n`);

  // 7. Create defender organization and user
  console.log('Creating defender user...');
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
  console.log(`✓ PUBLIC_DEFENDER: defender@legalaid.org (${defenderUser.id})\n`);

  // 8. Create additional demo cases for variety
  console.log('Creating additional demo cases...');
  const additionalCases = [
    {
      id: 'test-case-demo-002',
      debtAmount: 2500.00,
      creditorName: 'Metro Medical Center',
      debtorName: 'Jane Smith',
      status: 'ACTIVE' as const,
    },
    {
      id: 'test-case-demo-003',
      debtAmount: 8750.50,
      creditorName: 'Auto Finance Corp',
      debtorName: 'Robert Johnson',
      status: 'ACTIVE' as const,
    },
  ];

  for (const caseData of additionalCases) {
    const newCase = await prisma.case.upsert({
      where: { id: caseData.id },
      update: {},
      create: {
        ...caseData,
        organizationId: organization.id,
        referenceNumber: `REF-${caseData.id}`,
      },
    });
    console.log(`✓ Case: ${newCase.creditorName} - $${newCase.debtAmount}`);

    // Create demand letters for these cases
    await prisma.demandLetter.upsert({
      where: { id: `letter-${caseData.id}` },
      update: {},
      create: {
        id: `letter-${caseData.id}`,
        organizationId: organization.id,
        caseId: caseData.id,
        content: `Demand letter for ${caseData.debtorName} - Amount: $${caseData.debtAmount}`,
        status: 'PENDING_REVIEW',
      },
    });
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Seed completed successfully!\n');
  console.log('Test Credentials:');
  console.log('='.repeat(50));
  console.log(`Password for all users: ${TEST_PASSWORD}\n`);
  console.log('Staff Users (Demo Law Firm):');
  console.log('  - admin@lawfirm.com (FIRM_ADMIN)');
  console.log('  - attorney@lawfirm.com (ATTORNEY)');
  console.log('  - paralegal@lawfirm.com (PARALEGAL)');
  console.log('\nDebtor User:');
  console.log('  - john.debtor@example.com (DEBTOR)');
  console.log('  - Invitation link: /invite/debtor-demo-token');
  console.log('  - Verification: Last 4 SSN = 1234, DOB = 1985-06-15');
  console.log('\nDefender User:');
  console.log('  - defender@legalaid.org (PUBLIC_DEFENDER)');
  console.log('='.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
