import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertTriangle } from 'lucide-react';

export function ServerStatusMonitor() {
  const [isOffline, setIsOffline] = useState(false);
  const checkCountRef = useRef(0);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const isOfflineRef = useRef(false);

  useEffect(() => {
    const checkServerStatus = async () => {
      let hasError = false;
      let timeoutId: NodeJS.Timeout;

      try {
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Connection timeout')), 8000);
        });

        const supabaseCheck = supabase
          .from('user_profiles')
          .select('id')
          .limit(1);

        const { error } = await Promise.race([supabaseCheck, timeoutPromise]) as any;

        if (timeoutId) clearTimeout(timeoutId);

        if (error) {
          console.error('Supabase check error:', error);
          hasError = true;
        }
      } catch (supabaseError) {
        console.error('Supabase connection error:', supabaseError);
        hasError = true;
      }

      if (hasError) {
        checkCountRef.current += 1;
        console.log(`❌ Échec de connexion ${checkCountRef.current}/2`);

        if (checkCountRef.current >= 2 && !isOfflineRef.current) {
          console.log('🚨 Affichage du message de maintenance');
          isOfflineRef.current = true;
          setIsOffline(true);

          if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
          }
          intervalIdRef.current = setInterval(checkServerStatus, 5000);
        }
      } else {
        if (isOfflineRef.current) {
          console.log('✅ Connexion rétablie avec succès');
        }

        checkCountRef.current = 0;
        isOfflineRef.current = false;
        setIsOffline(false);

        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
        }
        intervalIdRef.current = setInterval(checkServerStatus, 10000);
      }
    };

    const handleOnline = () => {
      console.log('🌐 Connexion réseau détectée');
      checkCountRef.current = 0;
      isOfflineRef.current = false;
      setIsOffline(false);
      checkServerStatus();
    };

    const handleOffline = () => {
      console.log('❌ Perte de connexion réseau détectée');
      checkCountRef.current = 2;
      isOfflineRef.current = true;
      setIsOffline(true);

      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      intervalIdRef.current = setInterval(checkServerStatus, 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkServerStatus();
    intervalIdRef.current = setInterval(checkServerStatus, 10000);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
