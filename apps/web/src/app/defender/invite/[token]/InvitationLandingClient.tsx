'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shield, AlertCircle, Clock, CheckCircle2, Loader2, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';
import { useValidateInvitation, getErrorMessage } from '@/features/defender/hooks/useDefenderAuth';
import { DefenderRegistrationForm } from '@/features/defender/components/DefenderRegistrationForm';

type PageView = 'loading' | 'valid' | 'register' | 'error';

export default function InvitationLandingClient() {
  const params = useParams();
  const token = params.token as string;
  const { validate, validating, error, invitation } = useValidateInvitation();
  const [view, setView] = useState<PageView>('loading');

  useEffect(() => {
    if (token) {
      validate(token).then(result => {
        setView(result.valid ? 'valid' : 'error');
      });
    }
  }, [token, validate]);

  const handleGetStarted = () => {
    setView('register');
  };

  const errorInfo = error ? getErrorMessage(error) : null;

  // Loading state
  if (validating || view === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Validating your invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (view === 'error' && errorInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          {/* Logo/Branding */}
          <div className="mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Steno Partner Portal</h1>
          </div>

          {/* Error content */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              {error === 'INVITATION_EXPIRED' ? (
                <Clock className="h-6 w-6 text-red-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600" />
              )}
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error === 'INVITATION_EXPIRED' ? 'Invitation Expired' :
               error === 'INVITATION_REDEEMED' ? 'Invitation Already Used' :
               'Invalid Invitation'}
            </h2>

            <p className="text-gray-600 mb-6">{errorInfo.message}</p>

            {errorInfo.hasLoginLink && (
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            )}

            {errorInfo.hasContactLink && (
              <div className="mt-4">
                <a
                  href="mailto:support@example.com"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Contact Support
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Registration form view
  if (view === 'register' && invitation) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          {/* Logo/Branding */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Create Your Account</h1>
            <p className="mt-2 text-gray-600">Complete your registration to get started</p>
          </div>

          {/* Registration form */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <DefenderRegistrationForm
              invitationToken={token}
              email={invitation.email}
              organizationName={invitation.organizationName}
            />
          </div>
        </div>
      </div>
    );
  }

  // Valid invitation - Welcome page
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full text-center">
        {/* Logo/Branding */}
        <div className="mb-8">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Steno Partner Portal</h1>
          <p className="mt-2 text-gray-600">Public Defender Platform</p>
        </div>

        {/* Welcome content */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Welcome{invitation?.organizationName ? ` from ${invitation.organizationName}` : ''}!
          </h2>

          <p className="text-gray-600 mb-6">
            You've been invited to join the Steno Partner Portal as a Public Defender.
            This platform will help you manage your cases, collaborate with colleagues,
            and access important legal resources.
          </p>

          {/* Features list */}
          <div className="text-left mb-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">As a Public Defender, you'll be able to:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span>Review and manage assigned cases</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span>Access case documents and evidence</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span>Communicate securely with team members</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span>Track deadlines and important dates</span>
              </li>
            </ul>
          </div>

          {/* Invitation details */}
          {invitation && (
            <div className="text-left mb-6 border-t pt-4">
              <p className="text-sm text-gray-500">
                <span className="font-medium">Invitation for:</span> {invitation.email}
              </p>
            </div>
          )}

          {/* Get Started button */}
          <button
            onClick={handleGetStarted}
            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <User className="mr-2 h-5 w-5" />
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </button>
        </div>

        {/* Login link */}
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
