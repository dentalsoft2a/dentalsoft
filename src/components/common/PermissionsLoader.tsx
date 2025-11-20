import { ReactNode, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface PermissionsLoaderProps {
  loading: boolean;
  children: ReactNode;
  minLoadingTime?: number;
}

export function PermissionsLoader({ loading, children, minLoadingTime = 300 }: PermissionsLoaderProps) {
  const [showContent, setShowContent] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!loading) {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

      if (remainingTime > 0) {
        const timer = setTimeout(() => {
          setShowContent(true);
        }, remainingTime);

        return () => clearTimeout(timer);
      } else {
        setShowContent(true);
      }
    }
  }, [loading, startTime, minLoadingTime]);

  if (loading || !showContent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">Chargement des permissions...</p>
          <p className="text-gray-400 text-sm mt-2">Veuillez patienter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {children}
    </div>
  );
}
