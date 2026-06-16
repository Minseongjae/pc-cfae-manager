import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <header className="page-header px-6 py-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="heading-display text-xl">{title}</h1>
          {subtitle && (
            <p className="text-sm text-stone-500 mt-1 font-light">{subtitle}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </header>
  );
}
