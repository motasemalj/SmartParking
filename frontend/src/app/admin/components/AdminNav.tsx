'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UsersIcon,
  DocumentCheckIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { signOut } from 'next-auth/react';

export default function AdminNav() {
  const pathname = usePathname();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: HomeIcon,
      current: pathname === '/admin/dashboard',
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: UsersIcon,
      current: pathname === '/admin/users',
    },
    {
      name: 'Plates',
      href: '/admin/plates',
      icon: DocumentCheckIcon,
      current: pathname === '/admin/plates',
    },
    {
      name: 'Reports',
      href: '/admin/reports',
      icon: ChartBarIcon,
      current: pathname === '/admin/reports',
    },
  ];

  return (
    <div className="flex justify-between items-center mb-6">
      <nav className="flex space-x-4" aria-label="Tabs">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={
                `flex items-center px-3 py-2 text-sm font-medium rounded-md ` +
                (item.current
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')
              }
            >
              <Icon className="h-5 w-5 mr-2" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={() => signOut({ callbackUrl: '/auth/login' })}
        className="ml-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        Logout
      </button>
    </div>
  );
} 