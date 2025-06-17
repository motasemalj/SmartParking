'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

type FormData = {
  phoneNumber: string;
  otp: string;
};

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
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

  const sendOTP = async (phone: string) => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/otp/send`, {
        phoneNumber: phone
      });
      setPhoneNumber(phone);
      setStep('otp');
      setError('');
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        setError('This phone number is not in the system. Please contact or call the security office.');
      } else {
        setError('Failed to send OTP. Please try again.');
      }
    }
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {step === 'phone' ? 'Enter your phone number' : 'Enter OTP'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 'phone'
              ? 'We will send you a verification code'
              : `We sent a code to ${phoneNumber}`}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            {step === 'phone' ? (
              <div>
                <label htmlFor="phoneNumber" className="sr-only">
                  Phone Number
                </label>
                <input
                  {...register('phoneNumber', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^[0-9]{10}$/,
                      message: 'Please enter a valid 10-digit phone number'
                    }
                  })}
                  type="tel"
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Phone Number"
                />
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
                  type="text"
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Enter OTP"
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
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Please wait...' : step === 'phone' ? 'Send OTP' : 'Verify OTP'}
            </button>
          </div>

          {step === 'otp' && (
            <div className="text-sm text-center">
              <button
                type="button"
                onClick={() => setStep('phone')}
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