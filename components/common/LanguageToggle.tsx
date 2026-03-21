'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import i18n from '@/app/i18n';

export function LanguageToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [lang, setLang] = useState<string>('en');

  useEffect(() => {
    setLang(i18n.language?.startsWith('vi') ? 'vi' : 'en');
  }, []);

  const toggle = () => {
    const next = lang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(next);
    setLang(next);
  };

  const isVi = lang === 'vi';

  return (
    <button
      onClick={toggle}
      title={t('settings.language')}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200
                  hover:bg-gray-50 text-sm font-semibold text-gray-700 transition-colors
                  dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-300 ${className ?? ''}`}
    >
      <span className="text-base leading-none">{isVi ? '🇻🇳' : '🇺🇸'}</span>
      <span>{isVi ? 'VI' : 'EN'}</span>
    </button>
  );
}
