import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface CompanyLegalInfo {
  company_name: string;
  legal_form: string;
  capital: number;
  siret: string;
  rcs: string;
  vat_number: string;
  ape_code: string;
  address: string;
  phone: string;
  email: string;
  dpo_name: string;
  dpo_email: string;
  director_name: string;
  director_title: string;
}

const defaultInfo: CompanyLegalInfo = {
  company_name: 'DentalCloud',
  legal_form: 'SAS',
  capital: 10000,
  siret: 'Votre numéro SIRET',
  rcs: 'RCS Paris',
  vat_number: 'FR12345678901',
  ape_code: '6201Z',
  address: 'Votre adresse complète',
  phone: '+33 X XX XX XX XX',
  email: 'contact@dentalcloud.fr',
  dpo_name: 'Nom du DPO',
  dpo_email: 'dpo@dentalcloud.fr',
  director_name: 'Nom du Directeur',
  director_title: 'Président'
};

export function useCompanyLegalInfo() {
  const [info, setInfo] = useState<CompanyLegalInfo>(defaultInfo);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('company_legal_info')
        .select('company_name, legal_form, capital, siret, rcs, vat_number, ape_code, address, phone, email, dpo_name, dpo_email, director_name, director_title')
        .maybeSingle();

      if (error) {
        console.error('Error loading company legal info:', error);
        setInfo(defaultInfo);
      } else if (data) {
        setInfo({
          company_name: data.company_name || defaultInfo.company_name,
          legal_form: data.legal_form || defaultInfo.legal_form,
          capital: data.capital || defaultInfo.capital,
          siret: data.siret || defaultInfo.siret,
          rcs: data.rcs || defaultInfo.rcs,
          vat_number: data.vat_number || defaultInfo.vat_number,
          ape_code: data.ape_code || defaultInfo.ape_code,
          address: data.address || defaultInfo.address,
          phone: data.phone || defaultInfo.phone,
          email: data.email || defaultInfo.email,
          dpo_name: data.dpo_name || defaultInfo.dpo_name,
          dpo_email: data.dpo_email || defaultInfo.dpo_email,
          director_name: data.director_name || defaultInfo.director_name,
          director_title: data.director_title || defaultInfo.director_title
        });
      } else {
        setInfo(defaultInfo);
      }
    } catch (error) {
      console.error('Error in loadCompanyInfo:', error);
      setInfo(defaultInfo);
    } finally {
      setLoading(false);
    }
  };

  return { info, loading };
}
