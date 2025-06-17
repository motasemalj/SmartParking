'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardDocumentListIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function DashboardHeader() {
  const pathname = usePathname();

  const navigation = [
    {
      name: 'My Plates',
      href: '/dashboard',
      icon: ClipboardDocumentListIcon,
      current: pathname === '/dashboard',
    },
    {
      name: 'Entry History',
      href: '/dashboard/history',
      icon: ClockIcon,
      current: pathname === '/dashboard/history',
    },
  ];

  return (
    <div className="border-b border-gray-200 pb-5 mb-8">
      <div className="flex justify-between items-center">
        <nav className="flex space-x-4" aria-label="Tabs">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-md
                  ${
                    item.current
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Logout
        </button>
      </div>
    </div>
  );
} 