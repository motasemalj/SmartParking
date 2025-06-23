'use client';

import { ClockIcon } from '@heroicons/react/24/outline';

// Custom License Plate Icon
const LicensePlateIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
    strokeWidth={1.5}
  >
    {/* Plate frame */}
    <rect x="2" y="5" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    
    {/* Top border line */}
    <line x1="3" y1="7" x2="21" y2="7" strokeLinecap="round" strokeLinejoin="round" />
    
    {/* Plate numbers - "123" style */}
    <text x="6" y="15" fontSize="7" fill="currentColor" fontFamily="monospace" fontWeight="normal">123</text>
  </svg>
);

interface DashboardHeaderProps {
  activeTab: 'plates' | 'history';
  onTabChange: (tab: 'plates' | 'history') => void;
}

export default function DashboardHeader({ activeTab, onTabChange }: DashboardHeaderProps) {
  const navigation = [
    {
      name: 'My Plates',
      key: 'plates' as const,
      icon: LicensePlateIcon,
      current: activeTab === 'plates',
    },
    {
      name: 'Entry History',
      key: 'history' as const,
      icon: ClockIcon,
      current: activeTab === 'history',
    },
  ];

  return (
    <div className="border-b border-gray-200 pb-4 sm:pb-5 mb-6 sm:mb-8">
      {/* Mobile: Navigation tabs */}
      <div className="sm:hidden">
        <nav className="flex space-x-2" aria-label="Tabs">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => onTabChange(item.key)}
                className={`
                  flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors
                  ${
                    item.current
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                <span>{item.name === 'My Plates' ? 'Plates' : 'Entry History'}</span>
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* Desktop: Navigation tabs */}
      <div className="hidden sm:flex sm:justify-between sm:items-center">
        <nav className="flex space-x-4" aria-label="Tabs">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => onTabChange(item.key)}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${
                    item.current
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
} 