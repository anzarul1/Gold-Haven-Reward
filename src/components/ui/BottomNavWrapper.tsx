'use client';

import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';

export default function BottomNavWrapper() {
  const pathname = usePathname();

  // Hide bottom nav on admin panel routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return <BottomNav />;
}
