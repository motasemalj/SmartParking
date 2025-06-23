'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import CountrySelector, { Country, countries } from './CountrySelector';

type FormData = {
  phoneNumber: string;
  otp: string;
};

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find(c => c.code === 'AE') || countries[0]
  );
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue
  } = useForm<FormData>();

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.userType) {
      if (session.user.userType === 'SECURITY') {
        router.push('/security/dashboard');
      } else if (session.user.userType === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [status, session, router]);

  const formatPhoneNumber = (phone: string, dialCode: string) => {
    // Remove any non-digit characters from phone
    const cleanPhone = phone.replace(/\D/g, '');
    
    // If phone already starts with the dial code (without +), don't duplicate
    if (cleanPhone.startsWith(dialCode.substring(1))) {
      return `${dialCode}${cleanPhone.substring(dialCode.length - 1)}`;
    }
    
    return `${dialCode}${cleanPhone}`;
  };

  const sendOTP = async (phone: string) => {
    try {
      const fullPhoneNumber = formatPhoneNumber(phone, selectedCountry.dialCode);
      
      // Debug logging
      console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://smartparking-production-b700.up.railway.app';
      console.log('Using API URL:', apiUrl);
      console.log('Full URL being called:', `${apiUrl}/api/auth/otp/send`);
      console.log('Phone number:', fullPhoneNumber);
      
      await axios.post(`${apiUrl}/api/auth/otp/send`, {
        phoneNumber: fullPhoneNumber
      });
      setPhoneNumber(fullPhoneNumber);
      setStep('otp');
      setError('');
      reset({ otp: '' });
    } catch (error: unknown) {
      console.error('OTP send error:', error);
      if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'status' in error.response && error.response.status === 404) {
        setError('This phone number is not in the system. Please contact or call the security office.');
      } else {
        setError('Failed to send OTP. Please try again.');
      }
    }
  };

  const validatePhoneNumber = (value: string) => {
    if (!value) {
      return 'Phone number is required';
    }
    
    const cleanPhone = value.replace(/\D/g, '');
    
    // Limit to maximum 9 digits
    if (cleanPhone.length > 9) {
      return 'Phone number cannot exceed 9 digits';
    }
    
    // Minimum validation
    if (cleanPhone.length < 7) {
      return 'Phone number must be at least 7 digits';
    }
    
    return true;
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (step === 'phone') {
        await sendOTP(data.phoneNumber);
      } else {
        const result = await signIn('credentials', {
          phoneNumber,
          otp: data.otp,
          redirect: false
        });

        if (result?.error) {
          setError('Invalid OTP. Please try again.');
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  const handleCountryChange = (country: Country) => {
    setSelectedCountry(country);
    // Clear any existing phone number when country changes
    setValue('phoneNumber', '');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            {step === 'phone' ? 'Enter your phone number' : 'Enter OTP'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 'phone'
              ? 'We will send you a verification code'
              : `We sent a code to ${phoneNumber}`}
          </p>
        </div>

        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            {step === 'phone' ? (
              <div>
                <label htmlFor="phoneNumber" className="sr-only">
                  Phone Number
                </label>
                <div className="flex">
                  <CountrySelector
                    selectedCountry={selectedCountry}
                    onSelectCountry={handleCountryChange}
                    className="w-24 sm:w-28 flex-shrink-0"
                  />
                  <input
                    {...register('phoneNumber', {
                      required: 'Phone number is required',
                      validate: validatePhoneNumber
                    })}
                    type="tel"
                    maxLength={9}
                    className="flex-1 appearance-none rounded-r-md relative block w-full px-4 py-3 sm:py-2 border border-gray-300 border-l-0 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Phone Number"
                    autoComplete="tel"
                    onInput={(e) => {
                      // Only allow digits
                      const target = e.target as HTMLInputElement;
                      target.value = target.value.replace(/\D/g, '');
                    }}
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.phoneNumber.message}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor="otp" className="sr-only">
                  OTP
                </label>
                <input
                  {...register('otp', {
                    required: 'OTP is required',
                    pattern: {
                      value: /^[0-9]{6}$/,
                      message: 'Please enter the 6-digit OTP'
                    }
                  })}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="appearance-none rounded-md relative block w-full px-4 py-3 sm:py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Enter 6-digit OTP"
                  autoComplete="one-time-code"
                  onInput={(e) => {
                    // Only allow digits for OTP
                    const target = e.target as HTMLInputElement;
                    target.value = target.value.replace(/\D/g, '');
                  }}
                />
                {errors.otp && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.otp.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-3 sm:py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Please wait...' : step === 'phone' ? 'Send OTP' : 'Verify OTP'}
            </button>
          </div>

          {step === 'otp' && (
            <div className="text-sm text-center">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  reset();
                  setError('');
                }}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Change phone number
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 