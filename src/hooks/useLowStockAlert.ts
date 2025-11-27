import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useLowStockAlert() {
  const { user } = useAuth();
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkLowStock();

      const interval = setInterval(() => {
        checkLowStock();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const checkLowStock = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dental_resources')
        .select('id, stock_quantity, low_stock_threshold')
        .eq('dentist_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      const lowStockItems = data?.filter(
        item => item.stock_quantity <= item.low_stock_threshold
      ) || [];

      setLowStockCount(lowStockItems.length);
    } catch (error) {
      console.error('Error checking low stock:', error);
    } finally {
      setLoading(false);
    }
  };

  return { lowStockCount, loading, refresh: checkLowStock };
}
