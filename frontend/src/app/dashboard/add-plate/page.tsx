'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import DashboardHeader from '../components/DashboardHeader';
import { HomeIcon, UserPlusIcon } from '@heroicons/react/24/outline';

type FormData = {
  plateCode: string;
  plateNumber: string;
  country: string;
  type: string;
  documents: FileList;
};

const schema = yup.object({
  plateCode: yup.string().required('Plate code is required'),
  plateNumber: yup.string().required('Plate number is required'),
  country: yup.string().required('Country is required'),
  type: yup.string().required('Type is required'),
  documents: yup
    .mixed()
    .required('Document is required')
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
}).required() as yup.ObjectSchema<FormData>;

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
    watch
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

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
      formData.append('plateCode', data.plateCode);
      formData.append('plateNumber', data.plateNumber);
      formData.append('country', data.country);
      const typeValue = data.type === 'PERSONAL' || data.type === 'GUEST' ? data.type : '';
      formData.append('type', typeValue);
      console.log('Type value being sent:', typeValue);
      if (data.documents) {
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
      console.error('Error adding plate:', err);
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8">
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Add New Plate</h1>
          <p className="mt-2 text-md text-gray-500">
            Register a new number plate for your vehicle
          </p>
        </div>

        <DashboardHeader />

        <div className="bg-white/90 shadow-xl rounded-2xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded mb-4 flex items-center justify-center font-semibold">
                <svg className="h-5 w-5 mr-2 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="plateCode" className="block text-sm font-semibold text-gray-700 mb-1">
                Plate Code
              </label>
              <input
                type="text"
                {...register('plateCode')}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition placeholder-gray-400"
                placeholder="e.g. A"
              />
              {errors.plateCode && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {errors.plateCode.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="plateNumber" className="block text-sm font-semibold text-gray-700 mb-1">
                Plate Number
              </label>
              <input
                type="text"
                {...register('plateNumber')}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition placeholder-gray-400"
                placeholder="e.g. 12345"
              />
              {errors.plateNumber && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {errors.plateNumber.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-semibold text-gray-700 mb-1">
                Country
              </label>
              <select
                {...register('country')}
                className="block w-full rounded-lg border border-indigo-300 bg-indigo-100 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300 transition placeholder:text-gray-700 hover:border-indigo-400"
              >
                <option value="">Select a country</option>
                <option value="UAE">UAE</option>
                <option value="KSA">Saudi Arabia</option>
                <option value="QAT">Qatar</option>
                <option value="KWT">Kuwait</option>
                <option value="BHR">Bahrain</option>
                <option value="OMN">Oman</option>
              </select>
              {errors.country && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {errors.country.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-semibold text-gray-700 mb-1">
                Type
              </label>
              <div className="flex space-x-4 mt-2">
                <button
                  type="button"
                  className={`flex flex-col items-center justify-center flex-1 p-4 border-2 rounded-lg transition focus:outline-none
                    ${
                      (typeof watch === 'function' ? watch('type') : undefined) === 'PERSONAL'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-indigo-300'
                    }
                  `}
                  onClick={() => setValue('type', 'PERSONAL', { shouldValidate: true })}
                >
                  <HomeIcon className="h-8 w-8 mb-1 text-indigo-600" />
                  <span className="font-semibold text-gray-900">Resident</span>
                </button>
                <button
                  type="button"
                  className={`flex flex-col items-center justify-center flex-1 p-4 border-2 rounded-lg transition focus:outline-none
                    ${
                      (typeof watch === 'function' ? watch('type') : undefined) === 'GUEST'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-indigo-300'
                    }
                  `}
                  onClick={() => setValue('type', 'GUEST', { shouldValidate: true })}
                >
                  <UserPlusIcon className="h-8 w-8 mb-1 text-indigo-600" />
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

            <div>
              <label htmlFor="documents" className="block text-sm font-semibold text-gray-700 mb-1">
                Upload Document
              </label>
              <input
                type="file"
                {...register('documents')}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                accept="application/pdf,image/*"
                required
              />
              {errors.documents && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {errors.documents.message as string}
                </p>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center px-6 py-3 bg-indigo-600 text-white text-lg font-bold rounded-lg shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
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
  );
} 