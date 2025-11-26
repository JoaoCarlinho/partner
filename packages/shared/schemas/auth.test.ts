import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  passwordSchema,
  emailSchema,
} from './auth.js';

describe('Auth schemas', () => {
  describe('emailSchema', () => {
    it('should accept valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@domain.co.uk',
      ];

      validEmails.forEach((email) => {
        const result = emailSchema.safeParse(email);
        expect(result.success, `${email} should be valid`).toBe(true);
      });
    });

    it('should reject invalid emails', () => {
      const invalidEmails = ['not-an-email', 'missing@', '@nodomain.com', ''];

      invalidEmails.forEach((email) => {
        const result = emailSchema.safeParse(email);
        expect(result.success, `${email} should be invalid`).toBe(false);
      });
    });

    it('should normalize email to lowercase', () => {
      const result = emailSchema.parse('Test@EXAMPLE.com');
      expect(result).toBe('test@example.com');
    });
  });

  describe('passwordSchema', () => {
    it('should accept valid passwords', () => {
      const validPasswords = [
        'TestPassword1!',
        'Secure@Pass123',
        'MyP@ssw0rd!!',
        'ComplexP@ss1',
      ];

      validPasswords.forEach((password) => {
        const result = passwordSchema.safeParse(password);
        expect(result.success, `${password} should be valid`).toBe(true);
      });
    });

    it('should reject passwords shorter than 12 characters', () => {
      const result = passwordSchema.safeParse('Short1!');
      expect(result.success).toBe(false);
    });

    it('should reject passwords without uppercase', () => {
      const result = passwordSchema.safeParse('testpassword1!');
      expect(result.success).toBe(false);
    });

    it('should reject passwords without lowercase', () => {
      const result = passwordSchema.safeParse('TESTPASSWORD1!');
      expect(result.success).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      const result = passwordSchema.safeParse('TestPassword!!');
      expect(result.success).toBe(false);
    });

    it('should reject passwords without special characters', () => {
      const result = passwordSchema.safeParse('TestPassword123');
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should accept valid registration with new org', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'TestPassword1!',
        organizationName: 'My Company',
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid registration with invite code', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'TestPassword1!',
        inviteCode: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject registration without org or invite', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'TestPassword1!',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'not-an-email',
        password: 'TestPassword1!',
        organizationName: 'My Company',
      });
      expect(result.success).toBe(false);
    });

    it('should reject weak password', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'weak',
        organizationName: 'My Company',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'anypassword',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('verifyEmailSchema', () => {
    it('should accept valid token', () => {
      const result = verifyEmailSchema.safeParse({
        token: 'some-verification-token',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const result = verifyEmailSchema.safeParse({
        token: '',
      });
      expect(result.success).toBe(false);
    });
  });
});
