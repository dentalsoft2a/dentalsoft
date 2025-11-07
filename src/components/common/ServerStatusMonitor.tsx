import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertTriangle } from 'lucide-react';

export function ServerStatusMonitor() {
  const [isOffline, setIsOffline] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkServerStatus = async () => {
      let hasError = false;

      try {
        // Check if the application server is accessible
        const appServerCheck = await fetch(window.location.origin + '/logo.png', {
          method: 'HEAD',
          cache: 'no-cache'
        });

        if (!appServerCheck.ok) {
          console.error('Application server not accessible');
          hasError = true;
        }
      } catch (appError) {
        console.error('Application server connection error:', appError);
        hasError = true;
      }

      try {
        // Check if Supabase is accessible
        const { error } = await supabase
          .from('user_profiles')
          .select('id')
          .limit(1);

        if (error) {
          console.error('Supabase server check error:', error);
          hasError = true;
        }
      } catch (supabaseError) {
        console.error('Supabase connection error:', supabaseError);
        hasError = true;
      }

      if (hasError) {
        setCheckCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 2) {
            setIsOffline(true);
          }
          return newCount;
        });
      } else {
        setIsOffline(false);
        setCheckCount(0);
      }
    };

    // Listen to online/offline events
    const handleOnline = () => {
      setIsOffline(false);
      setCheckCount(0);
      checkServerStatus();
    };

    const handleOffline = () => {
      setCheckCount(prev => prev + 1);
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkServerStatus();

    intervalId = setInterval(checkServerStatus, 10000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="flex justify-center mb-6">
          <div className="bg-amber-100 rounded-full p-4">
            <AlertTriangle className="w-16 h-16 text-amber-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Maintenance en cours
        </h2>

        <p className="text-slate-600 mb-6 leading-relaxed">
          DentalCloud est actuellement en cours de mise à jour pour vous offrir une meilleure expérience.
        </p>

        <p className="text-slate-500 text-sm mb-6">
          Nos serveurs ne sont pas accessibles pour le moment. Veuillez patienter quelques instants.
        </p>

        <div className="flex items-center justify-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            Cette notification disparaîtra automatiquement une fois le service rétabli
          </p>
        </div>
      </div>
    </div>
  );
}
