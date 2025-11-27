import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingPage } from '../OnboardingPage';
import * as hooks from '../../hooks';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock the hooks
jest.mock('../../hooks', () => ({
  ...jest.requireActual('../../hooks'),
  useUploadCredential: jest.fn(),
  useSubmitCredentials: jest.fn(),
  useCompleteModule: jest.fn(),
  useAcceptTerms: jest.fn(),
  useOnboardingStatus: jest.fn(),
  validateCredentialFile: jest.fn(),
  CURRENT_TERMS_VERSION: '1.0.0',
}));

describe('OnboardingPage', () => {
  const mockUpload = jest.fn();
  const mockSubmit = jest.fn();
  const mockComplete = jest.fn();
  const mockAccept = jest.fn();
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (hooks.useUploadCredential as jest.Mock).mockReturnValue({
      upload: mockUpload,
      uploading: false,
      progress: null,
      error: null,
    });

    (hooks.useSubmitCredentials as jest.Mock).mockReturnValue({
      submit: mockSubmit,
      submitting: false,
      error: null,
    });

    (hooks.useCompleteModule as jest.Mock).mockReturnValue({
      complete: mockComplete,
      completing: false,
      error: null,
    });

    (hooks.useAcceptTerms as jest.Mock).mockReturnValue({
      accept: mockAccept,
      accepting: false,
      error: null,
    });

    (hooks.useOnboardingStatus as jest.Mock).mockReturnValue({
      status: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    (hooks.validateCredentialFile as jest.Mock).mockReturnValue(null);
  });

  describe('Initial render', () => {
    it('renders the onboarding page with title', () => {
      render(<OnboardingPage />);
      expect(screen.getByText('Public Defender Onboarding')).toBeInTheDocument();
    });

    it('shows credentials step by default', () => {
      render(<OnboardingPage />);
      expect(screen.getByText('Credential Verification')).toBeInTheDocument();
    });

    it('displays all credential upload cards', () => {
      render(<OnboardingPage />);
      expect(screen.getByText('Bar Card')).toBeInTheDocument();
      expect(screen.getByText('Photo ID')).toBeInTheDocument();
      expect(screen.getByText('Organization Letter')).toBeInTheDocument();
    });

    it('shows required indicator for bar card and photo id', () => {
      render(<OnboardingPage />);
      const barCard = screen.getByText('Bar Card').parentElement;
      const photoId = screen.getByText('Photo ID').parentElement;

      expect(barCard?.querySelector('.text-red-500')).toBeInTheDocument();
      expect(photoId?.querySelector('.text-red-500')).toBeInTheDocument();
    });
  });

  describe('Step indicators', () => {
    it('shows all step indicators', () => {
      render(<OnboardingPage />);
      expect(screen.getByText('Credentials')).toBeInTheDocument();
      expect(screen.getByText('Training')).toBeInTheDocument();
      expect(screen.getByText('Terms')).toBeInTheDocument();
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('highlights current step', () => {
      render(<OnboardingPage />);
      const credentialsStep = screen.getByText('Credentials').previousSibling;
      expect(credentialsStep).toHaveClass('bg-blue-600');
    });
  });

  describe('Credentials step', () => {
    it('disables submit button when required files are not uploaded', () => {
      render(<OnboardingPage />);
      const submitButton = screen.getByText('Submit for Verification');
      expect(submitButton).toBeDisabled();
    });

    it('shows file validation error for invalid files', async () => {
      (hooks.validateCredentialFile as jest.Mock).mockReturnValue('File type not supported');

      const { container } = render(<OnboardingPage />);

      // Find the first file input
      const fileInputs = container.querySelectorAll('input[type="file"]');
      expect(fileInputs.length).toBeGreaterThan(0);

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      fireEvent.change(fileInputs[0], { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('File type not supported')).toBeInTheDocument();
      });
    });
  });

  describe('With initial status from API', () => {
    it('shows training step when credentials are verified', () => {
      render(
        <OnboardingPage
          initialStatus={{
            status: 'CREDENTIALS_VERIFIED',
            completedSteps: ['credentials'],
            currentStep: 'training',
            progress: 33,
            credentials: [],
            trainingModules: [
              {
                id: '1',
                code: 'TEST',
                title: 'Test Module',
                description: 'Test description',
                duration: 15,
                required: true,
                status: 'not_started',
              },
            ],
            termsAccepted: false,
          }}
        />
      );

      expect(screen.getByText('Training Modules')).toBeInTheDocument();
    });

    it('shows terms step when training is complete', () => {
      render(
        <OnboardingPage
          initialStatus={{
            status: 'TERMS_PENDING',
            completedSteps: ['credentials', 'training'],
            currentStep: 'terms',
            progress: 75,
            credentials: [],
            trainingModules: [],
            termsAccepted: false,
          }}
        />
      );

      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    });

    it('shows completion step when status is ACTIVE', () => {
      render(
        <OnboardingPage
          initialStatus={{
            status: 'ACTIVE',
            completedSteps: ['credentials', 'training', 'terms'],
            currentStep: 'complete',
            progress: 100,
            credentials: [],
            trainingModules: [],
            termsAccepted: true,
          }}
        />
      );

      expect(screen.getByText('Congratulations!')).toBeInTheDocument();
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    });
  });

  describe('Training step', () => {
    const setupTrainingStep = () => {
      render(
        <OnboardingPage
          initialStatus={{
            status: 'CREDENTIALS_VERIFIED',
            completedSteps: ['credentials'],
            currentStep: 'training',
            progress: 33,
            credentials: [],
            trainingModules: [
              {
                id: '1',
                code: 'MODULE_1',
                title: 'Platform Overview',
                description: 'Learn the platform',
                duration: 15,
                required: true,
                status: 'not_started',
              },
              {
                id: '2',
                code: 'MODULE_2',
                title: 'Debtor Rights',
                description: 'Understand rights',
                duration: 30,
                required: true,
                status: 'not_started',
              },
            ],
            termsAccepted: false,
          }}
        />
      );
    };

    it('displays all training modules', () => {
      setupTrainingStep();
      expect(screen.getByText('Platform Overview')).toBeInTheDocument();
      expect(screen.getByText('Debtor Rights')).toBeInTheDocument();
    });

    it('shows start button for not started modules', () => {
      setupTrainingStep();
      const startButtons = screen.getAllByText('Start');
      expect(startButtons).toHaveLength(2);
    });

    it('shows progress bar', () => {
      setupTrainingStep();
      expect(screen.getByText('Training Progress')).toBeInTheDocument();
      expect(screen.getByText('0 of 2 completed')).toBeInTheDocument();
    });

    it('changes to complete button after starting module', async () => {
      setupTrainingStep();

      const startButtons = screen.getAllByText('Start');
      await userEvent.click(startButtons[0]);

      expect(screen.getByText('Mark Complete')).toBeInTheDocument();
    });
  });

  describe('Terms step', () => {
    const setupTermsStep = () => {
      render(
        <OnboardingPage
          initialStatus={{
            status: 'TERMS_PENDING',
            completedSteps: ['credentials', 'training'],
            currentStep: 'terms',
            progress: 75,
            credentials: [],
            trainingModules: [],
            termsAccepted: false,
          }}
        />
      );
    };

    it('displays terms of service content', () => {
      setupTermsStep();
      const headings = screen.getAllByRole('heading');
      expect(headings.some(h => h.textContent?.includes('Terms of Service'))).toBe(true);
      expect(screen.getByText(/Version 1.0.0/)).toBeInTheDocument();
    });

    it('shows agreement checkbox', () => {
      setupTermsStep();
      expect(screen.getByLabelText(/I have read and agree/)).toBeInTheDocument();
    });

    it('disables accept button until checkbox is checked', () => {
      setupTermsStep();
      const acceptButton = screen.getByText('Accept & Complete Onboarding');
      expect(acceptButton).toBeDisabled();
    });

    it('enables accept button when checkbox is checked', async () => {
      setupTermsStep();

      const checkbox = screen.getByLabelText(/I have read and agree/);
      await userEvent.click(checkbox);

      const acceptButton = screen.getByText('Accept & Complete Onboarding');
      expect(acceptButton).not.toBeDisabled();
    });

    it('calls accept terms API when button clicked', async () => {
      mockAccept.mockResolvedValue(undefined);
      setupTermsStep();

      const checkbox = screen.getByLabelText(/I have read and agree/);
      await userEvent.click(checkbox);

      const acceptButton = screen.getByText('Accept & Complete Onboarding');
      await userEvent.click(acceptButton);

      expect(mockAccept).toHaveBeenCalled();
    });
  });

  describe('Completion step', () => {
    it('shows congratulations message', () => {
      render(
        <OnboardingPage
          initialStatus={{
            status: 'ACTIVE',
            completedSteps: ['credentials', 'training', 'terms'],
            currentStep: 'complete',
            progress: 100,
            credentials: [],
            trainingModules: [],
            termsAccepted: true,
          }}
        />
      );

      expect(screen.getByText('Congratulations!')).toBeInTheDocument();
      expect(screen.getByText(/successfully completed your onboarding/)).toBeInTheDocument();
    });

    it('shows list of capabilities', () => {
      render(
        <OnboardingPage
          initialStatus={{
            status: 'ACTIVE',
            completedSteps: ['credentials', 'training', 'terms'],
            currentStep: 'complete',
            progress: 100,
            credentials: [],
            trainingModules: [],
            termsAccepted: true,
          }}
        />
      );

      expect(screen.getByText('Receive case assignments')).toBeInTheDocument();
      expect(screen.getByText('Communicate with debtors')).toBeInTheDocument();
      expect(screen.getByText('Provide guidance and advocacy')).toBeInTheDocument();
    });

    it('shows go to dashboard button', () => {
      render(
        <OnboardingPage
          initialStatus={{
            status: 'ACTIVE',
            completedSteps: ['credentials', 'training', 'terms'],
            currentStep: 'complete',
            progress: 100,
            credentials: [],
            trainingModules: [],
            termsAccepted: true,
          }}
        />
      );

      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    });
  });
});
