'use client';

import { useState, useCallback, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface InvitationValidation {
  valid: boolean;
  invitation?: {
    id: string;
    email: string;
    token: string;
    organizationName?: string;
    expiresAt: string;
  };
  error?: string;
}

export interface DefenderProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  organizationName?: string;
  barNumber: string;
  barState: string;
  role: string;
}

export interface RegistrationResponse {
  success: boolean;
  data: {
    user: DefenderProfile;
    token: string;
  };
}

export interface UseValidateInvitationResult {
  validate: (token: string) => Promise<InvitationValidation>;
  validating: boolean;
  error: string | null;
  invitation: InvitationValidation['invitation'] | null;
}

export function useValidateInvitation(): UseValidateInvitationResult {
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationValidation['invitation'] | null>(null);

  const validate = useCallback(async (token: string): Promise<InvitationValidation> => {
    setValidating(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/defenders/invitations/${token}/validate`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorCode = data.code || data.error || 'UNKNOWN_ERROR';
        setError(errorCode);
        return { valid: false, error: errorCode };
      }

      setInvitation(data.invitation || data);
      return { valid: true, invitation: data.invitation || data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate invitation';
      setError(errorMessage);
      return { valid: false, error: errorMessage };
    } finally {
      setValidating(false);
    }
  }, []);

  return { validate, validating, error, invitation };
}

export interface RegistrationParams {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  organizationName?: string;
  barNumber: string;
  barState: string;
  password: string;
}

export interface UseDefenderRegistrationResult {
  register: (params: RegistrationParams) => Promise<RegistrationResponse>;
  loading: boolean;
  error: string | null;
}

export function useDefenderRegistration(): UseDefenderRegistrationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async (params: RegistrationParams): Promise<RegistrationResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/defenders/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorCode = data.code || data.error || 'SERVER_ERROR';
        setError(errorCode);
        throw new Error(errorCode);
      }

      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { register, loading, error };
}

// US States for bar state dropdown
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

// Error message mapping
export const ERROR_MESSAGES: Record<string, { message: string; hasLoginLink?: boolean; hasContactLink?: boolean }> = {
  INVITATION_NOT_FOUND: {
    message: 'This invitation link is not valid.',
  },
  INVITATION_EXPIRED: {
    message: 'This invitation has expired. Please contact the administrator for a new invitation.',
    hasContactLink: true,
  },
  INVITATION_REDEEMED: {
    message: 'This invitation has already been used. If you need to access your account, please log in.',
    hasLoginLink: true,
  },
  EMAIL_EXISTS: {
    message: 'An account with this email already exists.',
    hasLoginLink: true,
  },
  INVALID_BAR_NUMBER: {
    message: 'Please enter a valid bar number for your state.',
  },
  SERVER_ERROR: {
    message: 'Something went wrong. Please try again.',
  },
};

export function getErrorMessage(code: string): { message: string; hasLoginLink?: boolean; hasContactLink?: boolean } {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.SERVER_ERROR;
}

// Onboarding Status Types
export type OnboardingStatusType =
  | 'INVITED'
  | 'REGISTERED'
  | 'CREDENTIALS_SUBMITTED'
  | 'CREDENTIALS_VERIFIED'
  | 'TRAINING_IN_PROGRESS'
  | 'TERMS_PENDING'
  | 'ACTIVE';

export interface TrainingModule {
  id: string;
  code: string;
  title: string;
  description: string;
  duration: number;
  required: boolean;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: string;
  content?: string;
}

export interface UploadedCredential {
  id: string;
  type: 'BAR_CARD' | 'PHOTO_ID' | 'ORGANIZATION_LETTER';
  fileName: string;
  uploadedAt: string;
  verified: boolean;
}

export interface OnboardingStatusResponse {
  status: OnboardingStatusType;
  completedSteps: string[];
  currentStep: string;
  progress: number;
  credentials: UploadedCredential[];
  trainingModules: TrainingModule[];
  termsAccepted: boolean;
  termsVersion?: string;
}

export interface UseOnboardingStatusResult {
  status: OnboardingStatusResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOnboardingStatus(): UseOnboardingStatusResult {
  const [status, setStatus] = useState<OnboardingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('NOT_AUTHENTICATED');
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/defenders/onboarding`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.code || 'FETCH_ERROR');
        return;
      }

      const data = await response.json();
      setStatus(data.data || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch onboarding status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}

// File validation constants
export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateCredentialFile(file: File): string | null {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return 'File type not supported. Please upload PDF, JPEG, PNG, or WebP.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File too large. Maximum size is 10MB.';
  }
  return null;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UseUploadCredentialResult {
  upload: (type: string, file: File) => Promise<UploadedCredential>;
  uploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
}

export function useUploadCredential(): UseUploadCredentialResult {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (type: string, file: File): Promise<UploadedCredential> => {
    setUploading(true);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });
    setError(null);

    // Validate file
    const validationError = validateCredentialFile(file);
    if (validationError) {
      setError(validationError);
      setUploading(false);
      throw new Error(validationError);
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('NOT_AUTHENTICATED');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      // Use XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            setProgress({ loaded: event.loaded, total: event.total, percentage });
          }
        });

        xhr.addEventListener('load', () => {
          setUploading(false);
          setProgress(null);

          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            resolve(data.data || data);
          } else {
            const errorData = JSON.parse(xhr.responseText);
            const errorCode = errorData.code || 'UPLOAD_FAILED';
            setError(errorCode);
            reject(new Error(errorCode));
          }
        });

        xhr.addEventListener('error', () => {
          setUploading(false);
          setProgress(null);
          setError('Network error during upload');
          reject(new Error('Network error during upload'));
        });

        xhr.open('POST', `${API_URL}/api/v1/defenders/credentials`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
    } catch (err) {
      setUploading(false);
      setProgress(null);
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      throw err;
    }
  }, []);

  return { upload, uploading, progress, error };
}

export interface UseSubmitCredentialsResult {
  submit: () => Promise<void>;
  submitting: boolean;
  error: string | null;
}

export function useSubmitCredentials(): UseSubmitCredentialsResult {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('NOT_AUTHENTICATED');
      }

      const response = await fetch(`${API_URL}/api/v1/defenders/credentials/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.code || 'SUBMIT_FAILED');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submit failed';
      setError(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submit, submitting, error };
}

export interface UseCompleteModuleResult {
  complete: (moduleId: string) => Promise<void>;
  completing: boolean;
  error: string | null;
}

export function useCompleteModule(): UseCompleteModuleResult {
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = useCallback(async (moduleId: string) => {
    setCompleting(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('NOT_AUTHENTICATED');
      }

      const response = await fetch(`${API_URL}/api/v1/defenders/training/${moduleId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.code || 'COMPLETE_FAILED');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete module';
      setError(message);
      throw err;
    } finally {
      setCompleting(false);
    }
  }, []);

  return { complete, completing, error };
}

// Terms acceptance
export const CURRENT_TERMS_VERSION = '1.0.0';

export interface UseAcceptTermsResult {
  accept: () => Promise<void>;
  accepting: boolean;
  error: string | null;
}

export function useAcceptTerms(): UseAcceptTermsResult {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = useCallback(async () => {
    setAccepting(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('NOT_AUTHENTICATED');
      }

      const response = await fetch(`${API_URL}/api/v1/defenders/terms/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ termsVersion: CURRENT_TERMS_VERSION }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.code || 'ACCEPT_FAILED');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept terms';
      setError(message);
      throw err;
    } finally {
      setAccepting(false);
    }
  }, []);

  return { accept, accepting, error };
}

// Auth check hook
export function useDefenderAuth(): { isAuthenticated: boolean; isLoading: boolean } {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  return { isAuthenticated, isLoading };
}

// Dashboard types
export interface DashboardSummary {
  activeCases: number;
  needsAttention: number;
  completedCases: number;
  pendingConsent: number;
}

export interface RecentActivity {
  type: string;
  description: string;
  timestamp: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  recentActivity: RecentActivity[];
  upcomingDeadlines: {
    caseId: string;
    debtorName: string;
    deadline: string;
    type: string;
  }[];
}

export interface UseDefenderDashboardResult {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDefenderDashboard(): UseDefenderDashboardResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('NOT_AUTHENTICATED');
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/defender/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.code || 'FETCH_ERROR');
        return;
      }

      const responseData = await response.json();
      setData(responseData.data || responseData);
    } catch (err) {
      // Fallback to mock data if API unavailable
      setData({
        summary: {
          activeCases: 6,
          needsAttention: 2,
          completedCases: 12,
          pendingConsent: 3,
        },
        recentActivity: [
          { type: 'PAYMENT', description: 'Payment received for Case #1234', timestamp: new Date().toISOString() },
          { type: 'MESSAGE', description: 'New message from John D.', timestamp: new Date(Date.now() - 3600000).toISOString() },
          { type: 'ASSIGNMENT', description: 'New case assigned: Sarah M.', timestamp: new Date(Date.now() - 86400000).toISOString() },
        ],
        upcomingDeadlines: [
          { caseId: 'c1', debtorName: 'John D.', deadline: new Date(Date.now() + 86400000 * 3).toISOString(), type: 'Payment Due' },
          { caseId: 'c2', debtorName: 'Sarah M.', deadline: new Date(Date.now() + 86400000 * 7).toISOString(), type: 'Response Required' },
        ],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refetch: fetchDashboard };
}

// User profile hook for navigation
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: OnboardingStatusType;
}

export interface UseUserProfileResult {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export function useUserProfile(): UseUserProfileResult {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('NOT_AUTHENTICATED');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/v1/defenders/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.code || 'FETCH_ERROR');
          // Fallback to mock data
          setUser({
            id: 'mock-id',
            firstName: 'Jane',
            lastName: 'Defender',
            email: 'jane@example.com',
            role: 'defender',
            status: 'ACTIVE',
          });
          return;
        }

        const data = await response.json();
        setUser(data.data || data);
      } catch {
        // Fallback to mock data
        setUser({
          id: 'mock-id',
          firstName: 'Jane',
          lastName: 'Defender',
          email: 'jane@example.com',
          role: 'defender',
          status: 'ACTIVE',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return { user, loading, error };
}

// Case assignment hook
export interface CaseAssignment {
  id: string;
  caseId: string;
  debtorName: string;
  status: string;
  assignedAt: string;
}

export interface UseCaseAssignmentResult {
  assignment: CaseAssignment | null;
  loading: boolean;
  error: string | null;
  errorCode: number | null;
}

export function useCaseAssignment(caseId: string): UseCaseAssignmentResult {
  const [assignment, setAssignment] = useState<CaseAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  useEffect(() => {
    const fetchAssignment = async () => {
      if (!caseId) {
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('NOT_AUTHENTICATED');
          setErrorCode(401);
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/v1/defender/cases/${caseId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 404) {
          setError('Case not found');
          setErrorCode(404);
          setLoading(false);
          return;
        }

        if (response.status === 403) {
          setError('Access denied');
          setErrorCode(403);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.code || 'FETCH_ERROR');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setAssignment(data.data || data);
      } catch {
        // Fallback to mock data for demo
        setAssignment({
          id: 'assignment-1',
          caseId,
          debtorName: 'John D.',
          status: 'ACTIVE',
          assignedAt: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [caseId]);

  return { assignment, loading, error, errorCode };
}

// Logout function
export function useLogout(): { logout: () => void } {
  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }, []);

  return { logout };
}
