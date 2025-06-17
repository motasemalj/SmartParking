'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardDocumentListIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function UserNav() {
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
  );
} 