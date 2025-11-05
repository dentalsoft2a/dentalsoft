interface DentalCloudLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export default function DentalCloudLogo({ size = 40, className = '', showText = true }: DentalCloudLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logo.png"
        alt="DentalCloud Logo"
        width={size}
        height={size}
        className="rounded-xl"
      />

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
