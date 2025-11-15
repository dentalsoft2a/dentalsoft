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
      supabase.removeChannel(channel);
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
          bg: 'bg-gradient-to-r from-blue-50 to-blue-50/50',
          border: 'border-blue-200/60',
          text: 'text-blue-900',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          closeHover: 'hover:bg-blue-100',
          icon: <Info className="w-5 h-5" />,
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-50 to-amber-50/50',
          border: 'border-amber-200/60',
          text: 'text-amber-900',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          closeHover: 'hover:bg-amber-100',
          icon: <AlertTriangle className="w-5 h-5" />,
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-50 to-red-50/50',
          border: 'border-red-200/60',
          text: 'text-red-900',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          closeHover: 'hover:bg-red-100',
          icon: <AlertCircle className="w-5 h-5" />,
        };
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-emerald-50 to-emerald-50/50',
          border: 'border-emerald-200/60',
          text: 'text-emerald-900',
          iconBg: 'bg-emerald-100',
          iconColor: 'text-emerald-600',
          closeHover: 'hover:bg-emerald-100',
          icon: <CheckCircle className="w-5 h-5" />,
        };
    }
  };

  const styles = getAlertStyles();

  return (
    <div className={`${styles.bg} ${styles.border} border backdrop-blur-sm rounded-xl shadow-sm p-4 mb-6 transition-all duration-300 hover:shadow-md`}>
      <div className="flex items-start gap-4">
        <div className={`${styles.iconBg} ${styles.iconColor} p-2 rounded-lg flex-shrink-0`}>
          {styles.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-base mb-1 ${styles.text}`}>
            {alert.title}
          </h3>
          <p className={`text-sm ${styles.text} opacity-90 leading-relaxed`}>
            {alert.message}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className={`${styles.closeHover} ${styles.iconColor} p-2 rounded-lg transition-colors flex-shrink-0`}
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
