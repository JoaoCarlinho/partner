'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useDefenderRegistration, US_STATES, getErrorMessage } from '../hooks/useDefenderAuth';
import Link from 'next/link';

interface DefenderRegistrationFormProps {
  invitationToken: string;
  email: string;
  organizationName?: string;
  onSuccess?: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  organizationName: string;
  barNumber: string;
  barState: string;
  password: string;
  confirmPassword: string;
}

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  barNumber?: string;
  barState?: string;
  password?: string;
  confirmPassword?: string;
}

// Password validation helpers
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 4) return { score, label: 'Medium', color: 'bg-yellow-500' };
  return { score, label: 'Strong', color: 'bg-green-500' };
}

function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least 1 number';
  return undefined;
}

export function DefenderRegistrationForm({
  invitationToken,
  email,
  organizationName: initialOrgName = '',
  onSuccess,
}: DefenderRegistrationFormProps) {
  const router = useRouter();
  const { register, loading, error: apiError } = useDefenderRegistration();

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    phone: '',
    organizationName: initialOrgName,
    barNumber: '',
    barState: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const passwordStrength = getPasswordStrength(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name);
  };

  const validateField = (fieldName: string) => {
    const value = formData[fieldName as keyof FormData];
    let error: string | undefined;

    switch (fieldName) {
      case 'firstName':
        if (!value.trim()) error = 'First name is required';
        break;
      case 'lastName':
        if (!value.trim()) error = 'Last name is required';
        break;
      case 'barNumber':
        if (!value.trim()) error = 'Bar number is required';
        break;
      case 'barState':
        if (!value) error = 'Bar state is required';
        break;
      case 'password':
        error = validatePassword(value);
        break;
      case 'confirmPassword':
        if (!value) error = 'Please confirm your password';
        else if (value !== formData.password) error = 'Passwords do not match';
        break;
    }

    setErrors(prev => ({ ...prev, [fieldName]: error }));
    return !error;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.barNumber.trim()) newErrors.barNumber = 'Bar number is required';
    if (!formData.barState) newErrors.barState = 'Bar state is required';

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    // Mark all fields as touched so errors display
    setTouched({
      firstName: true,
      lastName: true,
      barNumber: true,
      barState: true,
      password: true,
      confirmPassword: true,
    });
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const response = await register({
        token: invitationToken,
        email,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
        organizationName: formData.organizationName.trim() || undefined,
        barNumber: formData.barNumber.trim(),
        barState: formData.barState,
        password: formData.password,
      });

      // Store auth token
      if (response.data?.token) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      // Show success state
      setShowSuccess(true);

      // Callback if provided
      onSuccess?.();

      // Redirect to onboarding after brief delay
      setTimeout(() => {
        router.push('/defender/onboarding');
      }, 1500);
    } catch (err) {
      // Error is handled by the hook - clear password fields
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: '',
      }));
    }
  };

  const errorInfo = apiError ? getErrorMessage(apiError) : null;

  if (showSuccess) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Account created successfully!</h3>
        <p className="text-gray-600 mb-4">Redirecting to onboarding...</p>
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorInfo && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700">{errorInfo.message}</p>
              {errorInfo.hasLoginLink && (
                <Link href="/login" className="text-sm font-medium text-red-700 hover:text-red-600 underline">
                  Log in instead
                </Link>
              )}
              {errorInfo.hasContactLink && (
                <p className="text-sm text-red-700 mt-1">
                  <a href="mailto:support@example.com" className="font-medium hover:underline">
                    Contact Support
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email - read only */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          disabled
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-600 cursor-not-allowed sm:text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">Email is pre-filled from your invitation</p>
      </div>

      {/* Name fields - side by side */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            First name <span className="text-red-500">*</span>
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            value={formData.firstName}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={loading}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-1 ${
              errors.firstName && touched.firstName
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
          {errors.firstName && touched.firstName && (
            <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Last name <span className="text-red-500">*</span>
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            value={formData.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={loading}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-1 ${
              errors.lastName && touched.lastName
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
          {errors.lastName && touched.lastName && (
            <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Phone - optional */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone number <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          disabled={loading}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* Organization Name */}
      <div>
        <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
          Organization name <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="organizationName"
          name="organizationName"
          type="text"
          value={formData.organizationName}
          onChange={handleChange}
          disabled={loading}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* Bar Number and State - side by side */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="barNumber" className="block text-sm font-medium text-gray-700">
            Bar number <span className="text-red-500">*</span>
          </label>
          <input
            id="barNumber"
            name="barNumber"
            type="text"
            required
            value={formData.barNumber}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={loading}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-1 ${
              errors.barNumber && touched.barNumber
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
          {errors.barNumber && touched.barNumber && (
            <p className="mt-1 text-xs text-red-600">{errors.barNumber}</p>
          )}
        </div>

        <div>
          <label htmlFor="barState" className="block text-sm font-medium text-gray-700">
            Bar state <span className="text-red-500">*</span>
          </label>
          <select
            id="barState"
            name="barState"
            required
            value={formData.barState}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={loading}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-1 ${
              errors.barState && touched.barState
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
          >
            <option value="">Select state</option>
            {US_STATES.map(state => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>
          {errors.barState && touched.barState && (
            <p className="mt-1 text-xs text-red-600">{errors.barState}</p>
          )}
        </div>
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password <span className="text-red-500">*</span>
        </label>
        <div className="relative mt-1">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={loading}
            className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-1 ${
              errors.password && touched.password
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {formData.password && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${passwordStrength.color}`}
                  style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${
                passwordStrength.label === 'Weak' ? 'text-red-600' :
                passwordStrength.label === 'Medium' ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {passwordStrength.label}
              </span>
            </div>
          </div>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Min 8 characters, 1 uppercase, 1 number
        </p>
        {errors.password && touched.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm password <span className="text-red-500">*</span>
        </label>
        <div className="relative mt-1">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={loading}
            className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-1 ${
              errors.confirmPassword && touched.confirmPassword
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.confirmPassword && touched.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Submit button */}
      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center">
              <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
              Creating account...
            </span>
          ) : (
            'Create account'
          )}
        </button>
      </div>

      {/* Login link */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Log in
          </Link>
        </p>
      </div>
    </form>
  );
}

export default DefenderRegistrationForm;
