import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Info, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export default function AlertBanner() {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadActiveAlert();

    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
        },
        () => {
          loadActiveAlert();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadActiveAlert = async () => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('id, title, message, type')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .or('end_date.is.null,end_date.gte.' + new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setAlert(data);
      setDismissed(false);
    } catch (error: any) {
      console.error('Error loading active alert:', error);
    }
  };

  if (!alert || dismissed) {
    return null;
  }

  const getAlertStyles = () => {
    switch (alert.type) {
      case 'info':
        return {
          gradient: 'from-blue-500 via-blue-600 to-cyan-600',
          glow: 'shadow-blue-500/20',
          icon: <Info className="w-6 h-6" />,
        };
      case 'warning':
        return {
          gradient: 'from-amber-500 via-orange-500 to-red-500',
          glow: 'shadow-amber-500/20',
          icon: <AlertTriangle className="w-6 h-6" />,
        };
      case 'error':
        return {
          gradient: 'from-red-500 via-rose-600 to-pink-600',
          glow: 'shadow-red-500/20',
          icon: <AlertCircle className="w-6 h-6" />,
        };
      case 'success':
        return {
          gradient: 'from-emerald-500 via-green-600 to-teal-600',
          glow: 'shadow-emerald-500/20',
          icon: <CheckCircle className="w-6 h-6" />,
        };
    }
  };

  const styles = getAlertStyles();

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${styles.gradient} shadow-lg ${styles.glow} hover:shadow-xl transition-all duration-300`}>
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]"></div>

        {/* Content */}
        <div className="relative px-6 py-4">
          <div className="flex items-start gap-4">
            {/* Icon with pulse animation */}
            <div className="flex-shrink-0 mt-0.5">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-full blur-md animate-pulse"></div>
                <div className="relative bg-white/20 backdrop-blur-sm p-3 rounded-full border border-white/30 text-white">
                  {styles.icon}
                </div>
              </div>
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0 pt-1">
              <h3 className="font-bold text-white text-lg mb-1.5 tracking-tight drop-shadow-sm">
                {alert.title}
              </h3>
              <p className="text-white/95 text-sm leading-relaxed drop-shadow-sm">
                {alert.message}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={() => setDismissed(true)}
              className="flex-shrink-0 mt-1 group"
              aria-label="Fermer"
            >
              <div className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-2 rounded-lg border border-white/30 text-white transition-all duration-200 group-hover:scale-110">
                <X className="w-5 h-5" />
              </div>
            </button>
          </div>
        </div>

        {/* Bottom shine effect */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
      </div>
    </div>
  );
}
