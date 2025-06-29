'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import useSWR from 'swr';

interface Plate {
  id: string;
  plateCode: string;
  plateNumber: string;
  country: string;
  emirate?: string;
  type: 'PERSONAL' | 'GUEST';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

interface PlatesResponse {
  plates: Plate[];
}

const fetcher = (url: string, token: string) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json());

export default function UserDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { data, error, isLoading } = useSWR(
    status === 'authenticated' && session?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/plates`, session.accessToken]
      : null,
    ([url, token]) => fetcher(url, token)
  );
  const plates = Array.isArray(data) ? data : (data as PlatesResponse)?.plates || [];

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message || 'Failed to fetch plates'}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Plates</h1>
        <p className="text-gray-600">Newest plates appear first</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plates && plates.map((plate: Plate, index: number) => (
          <div key={plate.id} className="bg-white p-6 rounded-lg shadow relative">
            {index === 0 && plates.length > 1 && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                Newest
              </div>
            )}
            <h2 className="text-xl font-semibold mb-4">
              {plate.plateCode} {plate.plateNumber}
            </h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Status:</span>
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    plate.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : plate.status === 'REJECTED'
                      ? 'bg-red-100 text-red-800'
                      : plate.status === 'EXPIRED'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {plate.status}
                </span>
              </p>
              <p>
                <span className="font-medium">Country:</span> {plate.country}
                {plate.emirate && ` • ${plate.emirate}`}
              </p>
              <p>
                <span className="font-medium">Type:</span> {plate.type}
              </p>
              <p>
                <span className="font-medium">Added:</span> {new Date(plate.createdAt).toLocaleDateString()}
              </p>
              {plate.type === 'GUEST' && plate.expiresAt && (
                <p>
                  <span className="font-medium">Expires:</span> {new Date(plate.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
        {plates && plates.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 text-lg">No plates found</p>
            <p className="text-gray-400">Your new plates will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
} 