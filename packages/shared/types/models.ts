// Core model types matching Prisma schema

export enum Role {
  FIRM_ADMIN = 'FIRM_ADMIN',
  ATTORNEY = 'ATTORNEY',
  PARALEGAL = 'PARALEGAL',
  DEBTOR = 'DEBTOR',
  PUBLIC_DEFENDER = 'PUBLIC_DEFENDER',
}

export enum CaseStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
  CLOSED = 'CLOSED',
}

export enum LetterStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  SENT = 'SENT',
}

export enum PlanStatus {
  PROPOSED = 'PROPOSED',
  COUNTERED = 'COUNTERED',
  ACCEPTED = 'ACCEPTED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DEFAULTED = 'DEFAULTED',
}

export enum Frequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  role: Role;
  organizationId: string;
  emailVerified: boolean;
}

export interface AuthTokenPayload {
  sub: string; // user id
  org_id: string;
  role: Role;
  email: string;
  exp: number;
  iat: number;
}

export interface AuthResponse {
  user: UserPublic;
  accessToken: string;
  refreshToken?: string;
}
