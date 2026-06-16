import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  accent?: 'gold' | 'stone' | 'green' | 'blue';
}

const accentStyles = {
  gold: 'bg-gradient-to-br from-amber-50 to-stone-100 text-amber-600',
  stone: 'bg-stone-100 text-stone-500',
  green: 'bg-gradient-to-br from-emerald-50 to-stone-50 text-emerald-600',
  blue: 'bg-gradient-to-br from-sky-50 to-stone-50 text-sky-600',
};

export function StatCard({ title, value, subtitle, icon: Icon, accent = 'stone' }: StatCardProps) {
  return (
    <div className="card p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="label-caps normal-case tracking-wide">{title}</p>
          <p className="text-2xl font-semibold text-stone-800 mt-2 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-stone-400 mt-1.5 font-light">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-2xl shadow-sm ${accentStyles[accent]}`}>
          <Icon size={20} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
