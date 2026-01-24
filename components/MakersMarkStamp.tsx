interface MakersMarkStampProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'inline' | 'outline';
}

export function MakersMarkStamp({
  className = "",
  size = 'md',
  variant = 'default'
}: MakersMarkStampProps) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const variantClasses = {
    default: 'text-charcoal',
    inline: 'text-muted',
    outline: 'text-charcoal/60'
  };

  const finalClassName = `${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  return (
    <svg
      className={finalClassName}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="0.5" />

      <path
        d="M 35,45 L 50,35 L 65,45 L 60,60 L 40,60 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />

      <text
        x="50"
        y="80"
        textAnchor="middle"
        fontSize="9"
        fontWeight="500"
        fill="currentColor"
        letterSpacing="2"
      >
        TINGLUM
      </text>
    </svg>
  );
}
