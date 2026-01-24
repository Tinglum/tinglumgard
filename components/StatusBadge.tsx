import { Badge } from './ui/badge';

interface StatusBadgeProps {
  status: 'depositPaid' | 'remainderDue' | 'paid' | 'locked' | 'delivered' | 'completed' | 'atRisk';
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const variants: Record<typeof status, { bg: string; text: string; border: string }> = {
    depositPaid: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200' },
    remainderDue: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' },
    paid: { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200' },
    locked: { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200' },
    delivered: { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200' },
    completed: { bg: 'bg-neutral-50', text: 'text-neutral-900', border: 'border-neutral-200' },
    atRisk: { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200' },
  };

  const variant = variants[status];

  return (
    <Badge
      variant="outline"
      className={`${variant.bg} ${variant.text} ${variant.border}`}
    >
      {label}
    </Badge>
  );
}
