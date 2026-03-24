'use client'

import * as React from 'react'
import { Moon, Sun } from '@phosphor-icons/react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const activeTheme = theme === 'system' ? resolvedTheme : theme

  return (
    <div className='hidden sm:flex items-center rounded-md border border-gray-300/80 bg-gray-100 p-0.5 dark:border-white/15 dark:bg-white/5'>
      <button
        type='button'
        onClick={() => setTheme('light')}
        aria-label='Switch to light theme'
        className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors ${
          activeTheme === 'light'
            ? 'bg-white text-gray-900 shadow-sm dark:bg-white dark:text-black'
            : 'text-gray-600 hover:bg-white/70 dark:text-gray-300 dark:hover:bg-white/10'
        }`}
      >
        <Sun className='h-4 w-4' />
      </button>
      <button
        type='button'
        onClick={() => setTheme('dark')}
        aria-label='Switch to dark theme'
        className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors ${
          activeTheme === 'dark'
            ? 'bg-[#0F172A] text-white shadow-sm dark:bg-white dark:text-black'
            : 'text-gray-600 hover:bg-white/70 dark:text-gray-300 dark:hover:bg-white/10'
        }`}
      >
        <Moon className='h-4 w-4' />
      </button>
    </div>
  )
}
