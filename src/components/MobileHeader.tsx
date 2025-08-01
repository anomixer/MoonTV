'use client';

import Link from 'next/link';

import { BackButton } from './BackButton';
import { LogoutButton } from './LogoutButton';
import { SettingsButton } from './SettingsButton';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();
  return (
    <header className='md:hidden relative w-full bg-white/70 backdrop-blur-xl border-b border-gray-200/50 shadow-sm dark:bg-gray-900/70 dark:border-gray-700/50'>
      <div className='h-12 flex items-center justify-between px-4'>
        {/* 左側：返回按鈕和設置按鈕 */}
        <div className='flex items-center gap-2'>
          {showBackButton && <BackButton />}
          <SettingsButton />
        </div>

        {/* 右側按鈕 */}
        <div className='flex items-center gap-2'>
          <LogoutButton />
          <ThemeToggle />
        </div>
      </div>

      {/* 中間：Logo（絕對居中） */}
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <Link
          href='/'
          className='text-2xl font-bold text-green-600 tracking-tight hover:opacity-80 transition-opacity'
        >
          {siteName}
        </Link>
      </div>
    </header>
  );
};

export default MobileHeader;
