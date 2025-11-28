import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DentistLegalInfo {
  id?: string;
  dentist_id?: string;
  rpps_number: string;
  adeli_number: string;
  ordre_number: string;
  ars_region: string;
  siret_number: string;
  vat_number: string;
  company_name: string;
  legal_form: string;
  cabinet_address: string;
  cabinet_postal_code: string;
  cabinet_city: string;
  cabinet_country: string;
  cabinet_phone: string;
  cabinet_email: string;
  cabinet_website: string;
  bank_name: string;
  bank_iban: string;
  bank_bic: string;
  logo_url: string;
  invoice_prefix: string;
  invoice_footer_text: string;
  data_retention_years: number;
  dpo_name: string;
  dpo_email: string;
}

const defaultInfo: DentistLegalInfo = {
  rpps_number: '',
  adeli_number: '',
  ordre_number: '',
  ars_region: '',
  siret_number: '',
  vat_number: '',
  company_name: '',
  legal_form: 'Libéral',
  cabinet_address: '',
  cabinet_postal_code: '',
  cabinet_city: '',
  cabinet_country: 'France',
  cabinet_phone: '',
  cabinet_email: '',
  cabinet_website: '',
  bank_name: '',
  bank_iban: '',
  bank_bic: '',
  logo_url: '',
  invoice_prefix: 'FACT',
  invoice_footer_text: '',
  data_retention_years: 6,
  dpo_name: '',
  dpo_email: '',
};

export function useDentistLegalInfo(dentistId?: string) {
  const [info, setInfo] = useState<DentistLegalInfo>(defaultInfo);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dentistId) {
      loadLegalInfo(dentistId);
    } else {
      loadCurrentUserLegalInfo();
    }
  }, [dentistId]);

  const loadCurrentUserLegalInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      await loadLegalInfo(user.id);
    } catch (err) {
      console.error('Error loading current user legal info:', err);
      setError('Erreur lors du chargement des informations légales');
      setInfo(defaultInfo);
      setLoading(false);
    }
  };

  const loadLegalInfo = async (id: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('dentist_legal_info')
        .select('*')
        .eq('dentist_id', id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error loading dentist legal info:', fetchError);
        setError('Erreur lors du chargement des informations légales');
        setInfo(defaultInfo);
      } else if (data) {
        setInfo({
          ...defaultInfo,
          ...data,
        });
        setError(null);
      } else {
        setInfo(defaultInfo);
        setError(null);
      }
    } catch (err) {
      console.error('Error in loadLegalInfo:', err);
      setError('Erreur lors du chargement des informations légales');
      setInfo(defaultInfo);
    } finally {
      setLoading(false);
    }
  };

  const saveLegalInfo = async (updatedInfo: Partial<DentistLegalInfo>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const dataToSave = {
        ...updatedInfo,
        dentist_id: user.id,
        updated_at: new Date().toISOString(),
      };

      // Check if record exists
      const { data: existing } = await supabase
        .from('dentist_legal_info')
        .select('id')
        .eq('dentist_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('dentist_legal_info')
          .update(dataToSave)
          .eq('dentist_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('dentist_legal_info')
          .insert(dataToSave);

        if (insertError) throw insertError;
      }

      // Reload data
      await loadLegalInfo(user.id);
      return { success: true };
    } catch (err: any) {
      console.error('Error saving dentist legal info:', err);
      return { success: false, error: err.message };
    }
  };

  return { info, loading, error, saveLegalInfo, reload: loadCurrentUserLegalInfo };
}
