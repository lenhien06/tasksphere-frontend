'use client';

import { useEffect, useState } from 'react';
import '@/app/i18n'; // initializes i18next once

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  // Prevent hydration mismatch by waiting for client mount
  if (!ready) return null;

  return <>{children}</>;
}
