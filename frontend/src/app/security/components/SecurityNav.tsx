'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheckIcon, ClockIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { signOut } from 'next-auth/react';

export default function SecurityNav() {
  const pathname = usePathname();

  const navigation = [
    {
      name: 'Plate Requests',
      href: '/security/dashboard',
      icon: ShieldCheckIcon,
      current: pathname === '/security/dashboard',
    },
    {
      name: 'Access Logs',
      href: '/security/history',
      icon: ClockIcon,
      current: pathname === '/security/history',
    },
    {
      name: 'Temporary Access',
      href: '/security/temporary',
      icon: UserPlusIcon,
      current: pathname === '/security/temporary',
    },
  ];

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-indigo-600">Security Portal</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    item.current
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  <item.icon className="h-5 w-5 mr-2" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="ml-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 