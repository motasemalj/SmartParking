'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import DashboardHeader from '../components/DashboardHeader';
import PlatePreview from './components/PlatePreview';
import { HomeIcon, UserPlusIcon } from '@heroicons/react/24/outline';

type FormData = {
  plateCode: string;
  plateNumber: string;
  country: string;
  emirate?: string;
  type: string;
  documents: FileList;
  isBlankPlateCode: boolean;
};

const schema = yup.object({
  plateCode: yup.string().when('isBlankPlateCode', {
    is: true,
    then: (schema) => schema.optional(),
    otherwise: (schema) => schema
      .required('Plate code is required')
      .when('country', {
        is: 'KSA',
        then: (schema) => schema.max(3, 'Plate code cannot exceed 3 characters for Saudi Arabia'),
        otherwise: (schema) => schema.max(2, 'Plate code cannot exceed 2 characters'),
      }),
  }),
  plateNumber: yup.string()
    .required('Plate number is required')
    .max(5, 'Plate number cannot exceed 5 digits')
    .matches(/^\d+$/, 'Plate number must contain only numbers'),
  country: yup.string().required('Country is required'),
  emirate: yup.string().when('country', {
    is: 'UAE',
    then: (schema) => schema.required('Emirate is required for UAE plates'),
    otherwise: (schema) => schema.optional(),
  }),
  type: yup.string().required('Type is required'),
  isBlankPlateCode: yup.boolean().default(false),
  documents: yup
    .mixed()
    .when('type', {
      is: 'PERSONAL',
      then: (schema) => schema
        .required('Document is required for resident plates')
        .test('fileSize', 'File size must be less than 5MB', (value) => {
          if (!value) return false;
          let file: File | undefined;
          if (value instanceof FileList) {
            file = value.length > 0 ? value[0] : undefined;
          } else if (Array.isArray(value)) {
            file = value.length > 0 ? value[0] : undefined;
          }
          if (!file) return false;
          return file.size <= 5 * 1024 * 1024;
        }),
      otherwise: (schema) => schema.optional(),
    }),
}).required() as yup.ObjectSchema<FormData>;

const UAE_EMIRATES = [
  { value: 'ABU DHABI', label: 'Abu Dhabi' },
  { value: 'DUBAI', label: 'Dubai' },
  { value: 'SHARJAH', label: 'Sharjah' },
  { value: 'AJMAN', label: 'Ajman' },
  { value: 'UMM AL QUWAIN', label: 'Umm Al Quwain' },
  { value: 'RAS AL KHAIMAH', label: 'Ras Al Khaimah' },
  { value: 'FUJAIRAH', label: 'Fujairah' },
];

export default function AddPlatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Session status:', status);
    console.log('Session data:', session);
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [session, status, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      isBlankPlateCode: false
    }
  });

  const watchedValues = watch();
  const selectedCountry = watchedValues.country;
  const selectedEmirate = watchedValues.emirate;
  const isBlankPlateCode = watchedValues.isBlankPlateCode;
  const selectedType = watchedValues.type;

  // Reset emirate when country changes from UAE to something else
  useEffect(() => {
    if (selectedCountry !== 'UAE') {
      setValue('emirate', '');
    }
  }, [selectedCountry, setValue]);

  // Clear plate code when emirate changes
  useEffect(() => {
    setValue('plateCode', '');
  }, [selectedEmirate, setValue]);

  // Clear plate code when checkbox is checked
  useEffect(() => {
    if (isBlankPlateCode) {
      setValue('plateCode', '');
    }
  }, [isBlankPlateCode, setValue]);

  // Clear document file if user switches to Guest type so mulkeya doesn't leak over
  useEffect(() => {
    if (selectedType === 'GUEST') {
      setValue('documents', undefined as any); // reset file in form state
      const input = document.getElementById('documents') as HTMLInputElement | null;
      if (input) {
        input.value = '';
      }
    }
  }, [selectedType, setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Current session:', session);
      
      if (!session?.accessToken) {
        console.error('No access token in session');
        throw new Error('No access token available. Please log in again.');
      }

      const formData = new FormData();
      formData.append('plateCode', data.isBlankPlateCode ? 'BLANK' : data.plateCode);
      formData.append('plateNumber', data.plateNumber);
      formData.append('country', data.country);
      if (data.emirate) {
        formData.append('emirate', data.emirate);
      }
      const typeValue = data.type === 'PERSONAL' || data.type === 'GUEST' ? data.type : '';
      formData.append('type', typeValue);
      console.log('Type value being sent:', typeValue);
      if (data.type === 'PERSONAL' && data.documents) {
        formData.append('documents', data.documents[0]);
      }

      // Debug: log all FormData entries
      for (const pair of formData.entries()) {
        console.log(pair[0]+ ':', pair[1]);
      }

      console.log('Sending request with token:', session.accessToken);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/plates`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.warn('Error adding plate:', err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        (err.response?.data && typeof err.response.data === 'string' ? err.response.data : null) ||
        err.message ||
        'Failed to add plate'
      );
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-4 sm:py-8">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        {/* Logout button at the top */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>

        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Add New Plate</h1>
          <p className="mt-2 text-sm sm:text-md text-gray-500">
            Allow access of guest or personal cars to your community!
          </p>
        </div>

        <DashboardHeader />

        <div className="flex justify-center">
          {/* Form Section */}
          <div className="bg-white/90 shadow-xl rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-100 w-full max-w-2xl">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              {error && (
                <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded mb-4 flex items-center justify-center font-semibold text-sm">
                  <svg className="h-5 w-5 mr-2 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="country" className="block text-sm font-semibold text-gray-700 mb-2">
                  Country
                </label>
                <select
                  {...register('country')}
                  className="block w-full rounded-lg border border-indigo-300 bg-indigo-100 px-4 py-3 sm:py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300 transition placeholder:text-gray-700 hover:border-indigo-400"
                >
                  <option value="" className="text-gray-700 bg-indigo-100">Select a country</option>
                  <option value="UAE" className="text-gray-900 bg-white">UAE</option>
                  <option value="KSA" className="text-gray-900 bg-white">Saudi Arabia</option>
                  <option value="QAT" className="text-gray-900 bg-white">Qatar</option>
                  <option value="KWT" className="text-gray-900 bg-white">Kuwait</option>
                  <option value="BHR" className="text-gray-900 bg-white">Bahrain</option>
                  <option value="OMN" className="text-gray-900 bg-white">Oman</option>
                </select>
                {errors.country && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {errors.country.message}
                  </p>
                )}
              </div>

              {selectedCountry === 'UAE' && (
                <div>
                  <label htmlFor="emirate" className="block text-sm font-semibold text-gray-700 mb-2">
                    Emirate
                  </label>
                  <select
                    {...register('emirate')}
                    className="block w-full rounded-lg border border-indigo-300 bg-indigo-100 px-4 py-3 sm:py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300 transition placeholder:text-gray-700 hover:border-indigo-400"
                  >
                    <option value="" className="text-gray-700 bg-indigo-100">Select an emirate</option>
                    {UAE_EMIRATES.map((emirate) => (
                      <option key={emirate.value} value={emirate.value} className="text-gray-900 bg-white">
                        {emirate.label}
                      </option>
                    ))}
                  </select>
                  {errors.emirate && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      {errors.emirate.message}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="plateCode" className="block text-sm font-semibold text-gray-700 mb-2">
                  Plate Code
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      {...register('plateCode')}
                      onChange={(e) => {
                        let value = e.target.value;
                        
                        // Apply different validation based on emirate
                        if (selectedEmirate === 'SHARJAH' || selectedEmirate === 'ABU DHABI') {
                          // Only allow numbers for Sharjah and Abu Dhabi
                          value = value.replace(/[^0-9]/g, '');
                        } else if (selectedEmirate) {
                          // Only allow letters for other emirates
                          value = value.replace(/[^A-Za-z]/g, '').toUpperCase();
                        } else {
                          // Default: allow both but capitalize
                          value = value.toUpperCase();
                        }
                        
                        // Limit characters based on country
                        const maxLength = selectedCountry === 'KSA' ? 3 : 2;
                        if (value.length > maxLength) {
                          value = value.slice(0, maxLength);
                        }
                        
                        e.target.value = value;
                        setValue('plateCode', value);
                      }}
                      maxLength={selectedCountry === 'KSA' ? 3 : 2}
                      disabled={isBlankPlateCode}
                      style={{ textTransform: 'uppercase' }}
                      className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 sm:py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                      placeholder={
                        selectedEmirate === 'SHARJAH' || selectedEmirate === 'ABU DHABI' 
                          ? "e.g. 1" 
                          : selectedEmirate 
                            ? "e.g. A" 
                            : "e.g. A"
                      }
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('isBlankPlateCode')}
                      id="isBlankPlateCode"
                      className="h-5 w-5 text-black focus:ring-gray-500 border-gray-400 rounded"
                    />
                    <label htmlFor="isBlankPlateCode" className="ml-3 text-sm text-gray-700 font-medium">
                      No Plate Code
                    </label>
                  </div>
                </div>
                {errors.plateCode && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {errors.plateCode.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="plateNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                  Plate Number
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  {...register('plateNumber')}
                  onChange={(e) => {
                    // Only allow numbers and limit to 5 digits
                    let value = e.target.value.replace(/[^0-9]/g, '');
                    if (value.length > 5) {
                      value = value.slice(0, 5);
                    }
                    e.target.value = value;
                    setValue('plateNumber', value);
                  }}
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 sm:py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition placeholder-gray-400"
                  placeholder="e.g. 12345"
                />
                {errors.plateNumber && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {errors.plateNumber.message}
                  </p>
                )}
              </div>

              {/* Plate Preview */}
              <div className="flex justify-center">
                <PlatePreview
                  plateCode={watchedValues.plateCode || ''}
                  plateNumber={watchedValues.plateNumber || ''}
                  country={watchedValues.country || ''}
                  emirate={watchedValues.emirate || ''}
                  type={watchedValues.type || ''}
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-semibold text-gray-700 mb-2">
                  Type
                </label>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                  <button
                    type="button"
                    className={`flex flex-col items-center justify-center flex-1 p-4 sm:p-4 border-2 rounded-lg transition focus:outline-none
                      ${
                        (typeof watch === 'function' ? watch('type') : undefined) === 'PERSONAL'
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-indigo-300'
                      }
                    `}
                    onClick={() => setValue('type', 'PERSONAL', { shouldValidate: true })}
                  >
                    <HomeIcon className="h-8 w-8 mb-2 text-indigo-600" />
                    <span className="font-semibold text-gray-900">Resident</span>
                  </button>
                  <button
                    type="button"
                    className={`flex flex-col items-center justify-center flex-1 p-4 sm:p-4 border-2 rounded-lg transition focus:outline-none
                      ${
                        (typeof watch === 'function' ? watch('type') : undefined) === 'GUEST'
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-indigo-300'
                      }
                    `}
                    onClick={() => setValue('type', 'GUEST', { shouldValidate: true })}
                  >
                    <UserPlusIcon className="h-8 w-8 mb-2 text-indigo-600" />
                    <span className="font-semibold text-gray-900">Guest</span>
                  </button>
                </div>
                <input type="hidden" {...register('type', { required: true })} />
                {errors.type && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {errors.type.message}
                  </p>
                )}
              </div>

              {watchedValues.type === 'GUEST' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Guest Access Notice
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Guest access expires automatically after 24 hours from the time of approval.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {watchedValues.type === 'PERSONAL' && (
                <div>
                  <label htmlFor="documents" className="block text-sm font-semibold text-gray-700 mb-2">
                    Upload Vehicle License / Mulkeya
                  </label>
                  <input
                    type="file"
                    {...register('documents')}
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 sm:py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                    accept="application/pdf,image/*"
                    required={watchedValues.type === 'PERSONAL'}
                  />
                  {errors.documents && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      {errors.documents.message as string}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center px-6 py-4 sm:py-3 bg-indigo-600 text-white text-lg font-bold rounded-lg shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    'Add Plate'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 