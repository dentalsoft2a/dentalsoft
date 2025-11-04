interface DentalCloudLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export default function DentalCloudLogo({ size = 40, className = '', showText = true }: DentalCloudLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="toothGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>

        <circle
          cx="50"
          cy="50"
          r="45"
          fill="url(#circleGradient)"
          opacity="0.1"
        />

        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="url(#circleGradient)"
          strokeWidth="2"
          fill="none"
        />

        <path
          d="M 50 25
             C 45 25, 40 27, 37 32
             C 35 35, 34 38, 34 42
             C 34 48, 36 52, 38 56
             C 40 60, 42 64, 44 68
             C 45 70, 46 72, 48 73
             C 49 74, 49.5 74.5, 50 75
             C 50.5 74.5, 51 74, 52 73
             C 54 72, 55 70, 56 68
             C 58 64, 60 60, 62 56
             C 64 52, 66 48, 66 42
             C 66 38, 65 35, 63 32
             C 60 27, 55 25, 50 25
             Z"
          fill="url(#toothGradient)"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        <ellipse
          cx="43"
          cy="40"
          rx="2"
          ry="3"
          fill="white"
          opacity="0.6"
        />

        <ellipse
          cx="50"
          cy="38"
          rx="2.5"
          ry="4"
          fill="white"
          opacity="0.7"
        />

        <path
          d="M 45 55 Q 50 58, 55 55"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
          opacity="0.3"
          strokeLinecap="round"
        />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className="text-xl font-bold bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 bg-clip-text text-transparent">
            DentalCloud
          </span>
          <span className="text-xs text-slate-500 -mt-1">Gestion dentaire</span>
        </div>
      )}
    </div>
  );
}
