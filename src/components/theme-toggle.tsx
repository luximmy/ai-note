'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []); // eslint-disable-line react-hooks/set-state-in-effect -- hydration guard, runs once

  if (!mounted) {
    return (
      <button
        type='button'
        className='flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors'
      >
        <Sun className='h-4 w-4' />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          className='flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors'
        >
          {theme === 'dark' ? (
            <Moon className='h-4 w-4' />
          ) : (
            <Sun className='h-4 w-4' />
          )}
          <span className='sr-only'>切换主题</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => setTheme('light')}>
          亮色
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          暗色
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          跟随系统
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
