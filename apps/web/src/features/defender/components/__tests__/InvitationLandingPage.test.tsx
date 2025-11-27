import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// We'll test the hook directly and the component logic separately
import { useValidateInvitation, getErrorMessage, ERROR_MESSAGES } from '../../hooks/useDefenderAuth';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useValidateInvitation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns valid result for valid token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        invitation: {
          id: 'inv-1',
          email: 'defender@example.com',
          token: 'valid-token',
          organizationName: 'Test Org',
        },
      }),
    });

    const TestComponent = () => {
      const { validate, validating, invitation } = useValidateInvitation();
      const [result, setResult] = React.useState<any>(null);

      React.useEffect(() => {
        validate('valid-token').then(setResult);
      }, [validate]);

      if (validating) return <div>Loading...</div>;
      if (result?.valid) return <div>Valid: {invitation?.email}</div>;
      return <div>Error</div>;
    };

    render(<TestComponent />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Valid: defender@example.com/)).toBeInTheDocument();
    });
  });

  it('returns error for invalid token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        code: 'INVITATION_NOT_FOUND',
      }),
    });

    const TestComponent = () => {
      const { validate, validating, error } = useValidateInvitation();
      const [result, setResult] = React.useState<any>(null);

      React.useEffect(() => {
        validate('invalid-token').then(setResult);
      }, [validate]);

      if (validating) return <div>Loading...</div>;
      if (result?.error) return <div>Error: {error}</div>;
      return <div>Success</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Error: INVITATION_NOT_FOUND/)).toBeInTheDocument();
    });
  });

  it('returns error for expired invitation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        code: 'INVITATION_EXPIRED',
      }),
    });

    const TestComponent = () => {
      const { validate, error } = useValidateInvitation();
      const [result, setResult] = React.useState<any>(null);

      React.useEffect(() => {
        validate('expired-token').then(setResult);
      }, [validate]);

      if (result?.error) return <div>Error: {error}</div>;
      return <div>Loading...</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Error: INVITATION_EXPIRED/)).toBeInTheDocument();
    });
  });

  it('returns error for redeemed invitation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        code: 'INVITATION_REDEEMED',
      }),
    });

    const TestComponent = () => {
      const { validate, error } = useValidateInvitation();
      const [result, setResult] = React.useState<any>(null);

      React.useEffect(() => {
        validate('redeemed-token').then(setResult);
      }, [validate]);

      if (result?.error) return <div>Error: {error}</div>;
      return <div>Loading...</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Error: INVITATION_REDEEMED/)).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const TestComponent = () => {
      const { validate, error } = useValidateInvitation();
      const [result, setResult] = React.useState<any>(null);

      React.useEffect(() => {
        validate('any-token').then(setResult);
      }, [validate]);

      if (error) return <div>Error: {error}</div>;
      return <div>Loading...</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
    });
  });
});

describe('getErrorMessage', () => {
  it('returns correct message for INVITATION_NOT_FOUND', () => {
    const result = getErrorMessage('INVITATION_NOT_FOUND');
    expect(result.message).toBe('This invitation link is not valid.');
  });

  it('returns correct message for INVITATION_EXPIRED with contact link', () => {
    const result = getErrorMessage('INVITATION_EXPIRED');
    expect(result.message).toContain('expired');
    expect(result.hasContactLink).toBe(true);
  });

  it('returns correct message for INVITATION_REDEEMED with login link', () => {
    const result = getErrorMessage('INVITATION_REDEEMED');
    expect(result.message).toContain('already been used');
    expect(result.hasLoginLink).toBe(true);
  });

  it('returns correct message for EMAIL_EXISTS with login link', () => {
    const result = getErrorMessage('EMAIL_EXISTS');
    expect(result.message).toContain('email already exists');
    expect(result.hasLoginLink).toBe(true);
  });

  it('returns correct message for INVALID_BAR_NUMBER', () => {
    const result = getErrorMessage('INVALID_BAR_NUMBER');
    expect(result.message).toContain('valid bar number');
  });

  it('returns generic message for unknown error codes', () => {
    const result = getErrorMessage('UNKNOWN_ERROR_CODE');
    expect(result.message).toBe('Something went wrong. Please try again.');
  });
});

describe('ERROR_MESSAGES', () => {
  it('has all required error codes defined', () => {
    expect(ERROR_MESSAGES.INVITATION_NOT_FOUND).toBeDefined();
    expect(ERROR_MESSAGES.INVITATION_EXPIRED).toBeDefined();
    expect(ERROR_MESSAGES.INVITATION_REDEEMED).toBeDefined();
    expect(ERROR_MESSAGES.EMAIL_EXISTS).toBeDefined();
    expect(ERROR_MESSAGES.INVALID_BAR_NUMBER).toBeDefined();
    expect(ERROR_MESSAGES.SERVER_ERROR).toBeDefined();
  });
});
