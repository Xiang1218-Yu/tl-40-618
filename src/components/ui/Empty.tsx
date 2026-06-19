import { cn } from '@/lib/utils';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
}

export default function Empty({
  icon,
  title = '暂无数据',
  description,
  action,
}: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-up">
      <div className="relative mb-6">
        <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-gold-200/40 to-navy-200/40 blur-2xl" />
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-card ring-1 ring-navy-100">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-ivory-100 to-ivory-200 text-navy-400">
            {icon ?? <Inbox className="h-10 w-10" strokeWidth={1.5} />}
          </div>
        </div>
      </div>

      <h3 className="mb-2 font-serif text-xl font-semibold text-navy-800">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-navy-500">{description}</p>
      )}

      {action && <div className={cn(description ? '' : 'mt-2')}>{action}</div>}
    </div>
  );
}
