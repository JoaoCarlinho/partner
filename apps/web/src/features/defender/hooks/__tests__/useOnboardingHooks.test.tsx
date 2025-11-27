import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import {
  useOnboardingStatus,
  useUploadCredential,
  useSubmitCredentials,
  useCompleteModule,
  useAcceptTerms,
  useDefenderAuth,
  validateCredentialFile,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
} from '../useDefenderAuth';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useOnboardingStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-token');
  });

  it('fetches onboarding status on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            status: 'REGISTERED',
            completedSteps: [],
            currentStep: 'credentials',
            progress: 0,
          },
        }),
    });

    const TestComponent = () => {
      const { status, loading } = useOnboardingStatus();
      if (loading) return <div>Loading...</div>;
      return <div>Status: {status?.status}</div>;
    };

    render(<TestComponent />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Status: REGISTERED')).toBeInTheDocument();
    });
  });

  it('sets error when not authenticated', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const TestComponent = () => {
      const { error, loading } = useOnboardingStatus();
      if (loading) return <div>Loading...</div>;
      return <div>Error: {error}</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('Error: NOT_AUTHENTICATED')).toBeInTheDocument();
    });
  });

  it('handles API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ code: 'SERVER_ERROR' }),
    });

    const TestComponent = () => {
      const { error, loading } = useOnboardingStatus();
      if (loading) return <div>Loading...</div>;
      return <div>Error: {error}</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('Error: SERVER_ERROR')).toBeInTheDocument();
    });
  });
});

describe('validateCredentialFile', () => {
  it('returns null for valid PDF file', () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    expect(validateCredentialFile(file)).toBeNull();
  });

  it('returns null for valid JPEG file', () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });
    expect(validateCredentialFile(file)).toBeNull();
  });

  it('returns null for valid PNG file', () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });
    expect(validateCredentialFile(file)).toBeNull();
  });

  it('returns null for valid WebP file', () => {
    const file = new File(['test'], 'test.webp', { type: 'image/webp' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });
    expect(validateCredentialFile(file)).toBeNull();
  });

  it('returns error for unsupported file type', () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'size', { value: 1024 });
    expect(validateCredentialFile(file)).toBe(
      'File type not supported. Please upload PDF, JPEG, PNG, or WebP.'
    );
  });

  it('returns error for file too large', () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }); // 15MB
    expect(validateCredentialFile(file)).toBe('File too large. Maximum size is 10MB.');
  });
});

describe('useSubmitCredentials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-token');
  });

  it('calls API to submit credentials', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const TestComponent = () => {
      const { submit, submitting } = useSubmitCredentials();
      return (
        <button onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      );
    };

    render(<TestComponent />);

    const button = screen.getByText('Submit');
    await act(async () => {
      button.click();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/defenders/credentials/submit'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('useCompleteModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-token');
  });

  it('calls API to complete module', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const TestComponent = () => {
      const { complete, completing } = useCompleteModule();
      return (
        <button onClick={() => complete('module-1')} disabled={completing}>
          {completing ? 'Completing...' : 'Complete'}
        </button>
      );
    };

    render(<TestComponent />);

    const button = screen.getByText('Complete');
    await act(async () => {
      button.click();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/defenders/training/module-1/complete'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('useAcceptTerms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-token');
  });

  it('calls API to accept terms with version', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const TestComponent = () => {
      const { accept, accepting } = useAcceptTerms();
      return (
        <button onClick={accept} disabled={accepting}>
          {accepting ? 'Accepting...' : 'Accept'}
        </button>
      );
    };

    render(<TestComponent />);

    const button = screen.getByText('Accept');
    await act(async () => {
      button.click();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/defenders/terms/accept'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"termsVersion":"1.0.0"'),
      })
    );
  });
});

describe('useDefenderAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns authenticated when token exists', async () => {
    mockLocalStorage.getItem.mockReturnValue('test-token');

    const TestComponent = () => {
      const { isAuthenticated, isLoading } = useDefenderAuth();
      if (isLoading) return <div>Loading...</div>;
      return <div>Authenticated: {isAuthenticated ? 'yes' : 'no'}</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('Authenticated: yes')).toBeInTheDocument();
    });
  });

  it('returns not authenticated when no token', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const TestComponent = () => {
      const { isAuthenticated, isLoading } = useDefenderAuth();
      if (isLoading) return <div>Loading...</div>;
      return <div>Authenticated: {isAuthenticated ? 'yes' : 'no'}</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('Authenticated: no')).toBeInTheDocument();
    });
  });
});

describe('Constants', () => {
  it('exports correct allowed file types', () => {
    expect(ALLOWED_FILE_TYPES).toContain('application/pdf');
    expect(ALLOWED_FILE_TYPES).toContain('image/jpeg');
    expect(ALLOWED_FILE_TYPES).toContain('image/png');
    expect(ALLOWED_FILE_TYPES).toContain('image/webp');
    expect(ALLOWED_FILE_TYPES).toHaveLength(4);
  });

  it('exports correct max file size', () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10MB
  });
});
