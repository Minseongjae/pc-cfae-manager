import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <header className="page-header px-4 py-4 md:px-6 md:py-5 shrink-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="heading-display text-lg md:text-xl hidden md:block">{title}</h1>
          {subtitle && (
            <p className="text-sm text-stone-500 mt-0 md:mt-1 font-light">{subtitle}</p>
          )}
        </div>
        {children && (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center w-full md:w-auto md:justify-end">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
