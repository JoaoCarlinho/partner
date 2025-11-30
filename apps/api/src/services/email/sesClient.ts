import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'johnathan.skeete@gauntletai.com';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email via AWS SES
 */
export async function sendEmail(params: EmailParams): Promise<void> {
  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [params.to],
    },
    Message: {
      Subject: { Data: params.subject },
      Body: {
        Html: { Data: params.html },
        ...(params.text && { Text: { Data: params.text } }),
      },
    },
  });

  await ses.send(command);
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: 'Verify your email address - Steno',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #493087;">Welcome to Steno</h1>
        <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}"
             style="background-color: #493087; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </p>
        <p style="color: #666;">This link will expire in 24 hours.</p>
        <p style="color: #666; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
    text: `Welcome to Steno! Please verify your email by visiting: ${verifyUrl}`,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: 'Reset Your Steno Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #493087;">Password Reset Request</h1>
        <p>You requested a password reset for your Steno account.</p>
        <p>Click the link below to set a new password:</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="background-color: #493087; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #666;">This link will expire in 24 hours.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this reset, please ignore this email or contact support if you have concerns.</p>
      </div>
    `,
    text: `You requested a password reset for your Steno account.\n\nReset your password by visiting: ${resetUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't request this reset, please ignore this email.`,
  });
}

/**
 * Send password changed confirmation email
 */
export async function sendPasswordChangedEmail(
  email: string
): Promise<void> {
  const timestamp = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short',
  });

  await sendEmail({
    to: email,
    subject: 'Your Steno Password Has Been Changed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #493087;">Password Changed Successfully</h1>
        <p>Your Steno account password was successfully changed on:</p>
        <p style="font-weight: bold; margin: 16px 0;">${timestamp}</p>
        <p style="color: #d32f2f; font-weight: bold;">If you did not make this change, please contact support immediately.</p>
        <p style="color: #666; margin-top: 24px;">
          Contact support: <a href="mailto:support@steno.com">support@steno.com</a>
        </p>
      </div>
    `,
    text: `Your Steno account password was successfully changed on ${timestamp}.\n\nIf you did not make this change, please contact support immediately at support@steno.com.`,
  });
}

/**
 * Send organization invite email
 */
export async function sendInviteEmail(
  email: string,
  organizationName: string,
  inviteCode: string
): Promise<void> {
  const inviteUrl = `${APP_URL}/register?invite=${inviteCode}`;

  await sendEmail({
    to: email,
    subject: `You've been invited to join ${organizationName} on Steno`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #493087;">You're Invited!</h1>
        <p>You've been invited to join <strong>${organizationName}</strong> on Steno.</p>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}"
             style="background-color: #493087; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </p>
        <p style="color: #666;">This invitation will expire in 7 days.</p>
      </div>
    `,
    text: `You've been invited to join ${organizationName} on Steno. Accept the invitation: ${inviteUrl}`,
  });
}
