'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface Plate {
  id: string;
  plateNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export default function UserDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plates, setPlates] = useState<Plate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchPlates();
    }
  }, [status, router]);

  const fetchPlates = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/plates`, {
        headers: {
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
      });
      setPlates(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch plates');
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-8">My Plates</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plates.map((plate) => (
          <div key={plate.id} className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Plate {plate.plateNumber}</h2>
            <p>Status: {plate.status}</p>
            <p>Added: {new Date(plate.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 