import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertTriangle } from 'lucide-react';

export function ServerStatusMonitor() {
  const [isOffline, setIsOffline] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [retryInterval, setRetryInterval] = useState(10000);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    const checkServerStatus = async () => {
      let hasError = false;

      try {
        // Check Supabase connection with timeout
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Connection timeout')), 8000);
        });

        const supabaseCheck = supabase
          .from('user_profiles')
          .select('id')
          .limit(1);

        const { error } = await Promise.race([supabaseCheck, timeoutPromise]) as any;
        clearTimeout(timeoutId);

        if (error) {
          console.error('Supabase check error:', error);
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
            setRetryInterval(5000);
          }
          return newCount;
        });
      } else {
        const wasOffline = isOffline;
        setIsOffline(false);
        setCheckCount(0);
        setRetryInterval(10000);

        if (wasOffline) {
          console.log('✅ Connexion rétablie avec succès');
        }
      }
    };

    const handleOnline = () => {
      console.log('🌐 Connexion réseau détectée');
      setIsOffline(false);
      setCheckCount(0);
      setRetryInterval(10000);
      checkServerStatus();
    };

    const handleOffline = () => {
      console.log('❌ Perte de connexion réseau détectée');
      setCheckCount(prev => prev + 1);
      setIsOffline(true);
      setRetryInterval(5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkServerStatus();

    intervalId = setInterval(checkServerStatus, retryInterval);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryInterval, isOffline]);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-full p-5 shadow-lg">
            <AlertTriangle className="w-20 h-20 text-amber-600 animate-pulse" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Mise à jour en cours
        </h2>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-900 font-semibold mb-2">
            Maintenance système
          </p>
          <p className="text-blue-700 text-sm leading-relaxed">
            DentalCloud est actuellement en cours de mise à jour pour améliorer ses performances et sa sécurité.
          </p>
        </div>

        <p className="text-slate-600 mb-6 leading-relaxed">
          Nos serveurs sont temporairement inaccessibles. Cette interruption ne devrait durer que quelques minutes.
        </p>

        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <p className="text-slate-700 font-medium mb-2">
            Veuillez patienter...
          </p>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="text-slate-500 text-sm">
            Reconnexion automatique en cours...
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
            <p className="text-sm font-medium">
              Vérification de la connexion...
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Ce message disparaîtra automatiquement dès que la connexion sera rétablie
          </p>
        </div>
      </div>
    </div>
  );
}
