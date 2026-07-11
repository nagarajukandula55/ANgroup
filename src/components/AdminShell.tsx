'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/sidebar';

// Appointment/workorder "processing" screens (and their print sub-routes)
// are deliberately full-screen with no sidebar -- they were being squeezed
// into the leftover width next to the fixed sidebar ("small window within
// window"). Matches the detail route and any sub-route under it (e.g.
// .../print) but not the bare list pages (/admin/crm/calls, /admin/crm/jobsheets).
const FULL_BLEED_PATTERN = /^\/admin\/crm\/(calls|jobsheets)\/[^/]+/;

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const fullBleed = FULL_BLEED_PATTERN.test(pathname);

  if (fullBleed) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
