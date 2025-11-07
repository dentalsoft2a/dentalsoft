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
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-800',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />,
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          icon: <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
        };
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-800',
          icon: <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />,
        };
    }
  };

  const styles = getAlertStyles();

  return (
    <div className={`${styles.bg} border ${styles.text} rounded-lg p-4 mb-6`}>
      <div className="flex items-start gap-3">
        {styles.icon}
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{alert.title}</h3>
          <p className="text-sm">{alert.message}</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/50 rounded transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
