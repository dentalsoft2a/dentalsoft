import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Upload, X, User, Building2, Mail, Phone, MapPin, Image, FileText, Users, Shield, Link as LinkIcon, Copy, Check, Gift, UserPlus, UserCheck, MessageSquare, ShoppingCart, FileQuestion, Database } from 'lucide-react';
import EmployeeManagement from './EmployeeManagement';
import { FiscalPeriodsManager } from '../compliance/FiscalPeriodsManager';
import { AuditLogViewer } from '../compliance/AuditLogViewer';
import { ComplianceCertificate } from '../compliance/ComplianceCertificate';
import { GdprDataManagement } from './GdprDataManagement';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'employees' | 'referral' | 'compliance' | 'gdpr'>('profile');
  const [complianceSubTab, setComplianceSubTab] = useState<'certificate' | 'periods' | 'audit'>('certificate');
  const { profile, updateProfile, userEmail, user } = useAuth();
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    laboratory_name: profile?.laboratory_name || '',
    laboratory_email: profile?.laboratory_email || '',
    laboratory_phone: profile?.laboratory_phone || '',
    laboratory_address: profile?.laboratory_address || '',
    laboratory_logo_url: profile?.laboratory_logo_url || '',
    laboratory_rcs: profile?.laboratory_rcs || '',
    bank_iban: profile?.bank_iban || '',
    bank_bic: profile?.bank_bic || '',
  });
  const [dentistSettings, setDentistSettings] = useState({
    allow_dentist_orders: false,
    allow_dentist_quote_requests: false,
    dentist_portal_message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>(profile?.laboratory_logo_url || '');

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        laboratory_name: profile.laboratory_name || '',
        laboratory_email: profile.laboratory_email || '',
        laboratory_phone: profile.laboratory_phone || '',
        laboratory_address: profile.laboratory_address || '',
        laboratory_logo_url: profile.laboratory_logo_url || '',
        laboratory_rcs: profile.laboratory_rcs || '',
        bank_iban: profile.bank_iban || '',
        bank_bic: profile.bank_bic || '',
      });
      setLogoPreview(profile.laboratory_logo_url || '');
    }
    loadDentistSettings();
  }, [profile]);

  const loadDentistSettings = async () => {
    if (!user) return;

    try {
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('allow_dentist_orders, allow_dentist_quote_requests, dentist_portal_message')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDentistSettings({
          allow_dentist_orders: data.allow_dentist_orders || false,
          allow_dentist_quote_requests: data.allow_dentist_quote_requests || false,
          dentist_portal_message: data.dentist_portal_message || '',
        });
      }
    } catch (error) {
      console.error('Error loading dentist settings:', error);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Le fichier est trop volumineux. Taille maximale : 2 MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        setFormData({ ...formData, laboratory_logo_url: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setFormData({ ...formData, laboratory_logo_url: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    const { error } = await updateProfile(formData);

    if (error) {
      alert('Erreur lors de la mise à jour du profil');
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }

    setLoading(false);
  };

  const handleDentistSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setSuccess(false);

    try {
      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase
        .from('user_profiles')
        .update({
          allow_dentist_orders: dentistSettings.allow_dentist_orders,
          allow_dentist_quote_requests: dentistSettings.allow_dentist_quote_requests,
          dentist_portal_message: dentistSettings.dentist_portal_message,
        })
        .eq('id', user.id);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating dentist settings:', error);
      alert('Erreur lors de la mise à jour des paramètres dentistes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 bg-clip-text text-transparent">Paramètres</h1>
          <p className="text-slate-600 mt-2 sm:mt-3 text-sm sm:text-lg">Gérez les informations de votre laboratoire</p>
        </div>

        <div className="mb-6 sm:mb-8">
          <div className="flex gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'profile'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              Profil
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'employees'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              Employés
            </button>
            <button
              onClick={() => setActiveTab('referral')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'referral'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
              Affiliation
            </button>
            <button
              onClick={() => setActiveTab('compliance')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'compliance'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              Conformité
            </button>
            <button
              onClick={() => setActiveTab('gdpr')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'gdpr'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-4 h-4 sm:w-5 sm:h-5" />
              Mes données RGPD
            </button>
          </div>
        </div>

        {activeTab === 'gdpr' ? (
          <GdprDataManagement />
        ) : activeTab === 'compliance' ? (
          <div className="space-y-6">
            {/* Sous-onglets de conformité */}
            <div className="bg-white rounded-lg border border-slate-200 p-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setComplianceSubTab('certificate')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                    complianceSubTab === 'certificate'
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Attestation
                </button>
                <button
                  onClick={() => setComplianceSubTab('periods')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                    complianceSubTab === 'periods'
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Périodes fiscales
                </button>
                <button
                  onClick={() => setComplianceSubTab('audit')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                    complianceSubTab === 'audit'
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Journal d'audit
                </button>
              </div>
            </div>

            {/* Contenu des sous-onglets */}
            {complianceSubTab === 'certificate' && <ComplianceCertificate />}
            {complianceSubTab === 'periods' && <FiscalPeriodsManager />}
            {complianceSubTab === 'audit' && <AuditLogViewer />}
          </div>
        ) : activeTab === 'employees' ? (
          <EmployeeManagement />
        ) : activeTab === 'referral' ? (
          <ReferralSection />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/50 hover:shadow-2xl transition-all duration-300 overflow-hidden">
              <div className="relative p-4 sm:p-8 border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-cyan-50/20 backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-cyan-500/5"></div>
                <div className="relative flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Informations du compte</h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-1">Gérez vos informations personnelles et professionnelles</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6 sm:space-y-8">
                <div className="bg-gradient-to-br from-slate-50 to-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200/50 shadow-sm">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-5 flex items-center gap-2">
                    <div className="w-1 sm:w-1.5 h-5 sm:h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
                    Informations personnelles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-600" />
                        Prénom
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 text-sm sm:text-base border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-primary-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600" />
                        Nom
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 text-sm sm:text-base border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-cyan-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200/50 shadow-sm">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-5 flex items-center gap-2">
                    <div className="w-1 sm:w-1.5 h-5 sm:h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
                    Informations du laboratoire
                  </h3>
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                        <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-600" />
                        Nom du laboratoire
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.laboratory_name}
                        onChange={(e) => setFormData({ ...formData, laboratory_name: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 text-sm sm:text-base border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-primary-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                        <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600" />
                        Logo du laboratoire
                      </label>
                      <div className="space-y-3 sm:space-y-4">
                        {logoPreview ? (
                          <div className="relative inline-block group">
                            <img
                              src={logoPreview}
                              alt="Logo du laboratoire"
                              className="h-24 sm:h-32 w-auto object-contain border-2 border-primary-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-white shadow-lg group-hover:shadow-xl transition-all duration-300"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 p-1.5 sm:p-2 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl hover:scale-110"
                              title="Supprimer le logo"
                            >
                              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-slate-300 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center bg-gradient-to-br from-slate-50 to-white hover:border-primary-300 transition-all duration-300">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                              <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                            </div>
                            <p className="text-xs sm:text-sm font-medium text-slate-600 mb-0.5 sm:mb-1">Aucun logo téléchargé</p>
                            <p className="text-xs text-slate-500">Ajoutez votre logo professionnel</p>
                          </div>
                        )}
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                            id="logo-upload"
                          />
                          <label
                            htmlFor="logo-upload"
                            className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-primary-50 to-cyan-50 border-2 border-primary-200 text-primary-700 rounded-xl hover:from-primary-100 hover:to-cyan-100 hover:border-primary-300 transition-all duration-300 cursor-pointer font-semibold shadow-sm hover:shadow-md"
                          >
                            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                            {logoPreview ? 'Changer le logo' : 'Télécharger un logo'}
                          </label>
                          <p className="text-xs text-slate-500 mt-2 sm:mt-3 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                            Format : PNG, JPG, GIF • Taille max : 2 MB
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                        <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-600" />
                        Email du laboratoire
                      </label>
                      <input
                        type="email"
                        value={formData.laboratory_email}
                        onChange={(e) => setFormData({ ...formData, laboratory_email: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 text-sm sm:text-base border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-primary-300"
                        placeholder="contact@laboratoire.fr"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                        <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600" />
                        Téléphone du laboratoire
                      </label>
                      <input
                        type="tel"
                        value={formData.laboratory_phone}
                        onChange={(e) => setFormData({ ...formData, laboratory_phone: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 text-sm sm:text-base border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-cyan-300"
                        placeholder="+33 1 23 45 67 89"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-600" />
                        Adresse du laboratoire
                      </label>
                      <textarea
                        rows={3}
                        value={formData.laboratory_address}
                        onChange={(e) => setFormData({ ...formData, laboratory_address: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 text-sm sm:text-base border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-primary-300 resize-none"
                        placeholder="123 Rue Example&#10;75001 Paris, France"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600" />
                        RCS (Registre du Commerce et des Sociétés)
                      </label>
                      <input
                        type="text"
                        value={formData.laboratory_rcs}
                        onChange={(e) => setFormData({ ...formData, laboratory_rcs: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 text-sm sm:text-base border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-cyan-300"
                        placeholder="RCS 919 832 287 R.C.S. Ajaccio - Département immatriculation 2A"
                      />
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                        Cette information sera affichée sur vos proformas PDF
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-emerald-700 to-green-600 bg-clip-text text-transparent">Informations bancaires</span>
                    </h3>

                    <div className="space-y-4 sm:space-y-5">
                      <div>
                        <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                          IBAN (International Bank Account Number)
                        </label>
                        <input
                          type="text"
                          value={formData.bank_iban}
                          onChange={(e) => setFormData({ ...formData, bank_iban: e.target.value })}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 text-sm sm:text-base border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-emerald-300 font-mono"
                          placeholder="FR76 1234 5678 9012 3456 7890 123"
                        />
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                          Votre numéro de compte bancaire international
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                          BIC / SWIFT
                        </label>
                        <input
                          type="text"
                          value={formData.bank_bic}
                          onChange={(e) => setFormData({ ...formData, bank_bic: e.target.value })}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 text-sm sm:text-base border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-emerald-300 font-mono"
                          placeholder="ABCDEFGH123"
                        />
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                          Code d'identification de votre banque (8 ou 11 caractères)
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-3 sm:p-4">
                        <p className="text-xs sm:text-sm text-blue-800 flex items-start gap-2">
                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>Ces informations seront affichées sur vos factures PDF pour faciliter les paiements par virement bancaire.</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md">
                        <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">Portail Dentiste</span>
                    </h3>

                    <div className="bg-gradient-to-br from-blue-50/50 to-cyan-50/50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-4">
                      <p className="text-xs sm:text-sm text-blue-800 flex items-start gap-2">
                        <UserCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span>Activez ces options pour permettre à vos dentistes de passer des commandes directement depuis leur portail.</span>
                      </p>
                    </div>

                    <div className="space-y-4 sm:space-y-5">
                      <div className="flex items-start gap-3 sm:gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-all">
                        <input
                          type="checkbox"
                          id="allow_dentist_orders"
                          checked={dentistSettings.allow_dentist_orders}
                          onChange={(e) => setDentistSettings({ ...dentistSettings, allow_dentist_orders: e.target.checked })}
                          className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 mt-0.5"
                        />
                        <label htmlFor="allow_dentist_orders" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <ShoppingCart className="w-4 h-4 text-blue-600" />
                            <span className="text-sm sm:text-base font-bold text-slate-900">Autoriser les commandes directes</span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600">Les dentistes pourront créer des bons de livraison directement depuis leur portail</p>
                        </label>
                      </div>

                      <div className="flex items-start gap-3 sm:gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-cyan-300 transition-all">
                        <input
                          type="checkbox"
                          id="allow_dentist_quote_requests"
                          checked={dentistSettings.allow_dentist_quote_requests}
                          onChange={(e) => setDentistSettings({ ...dentistSettings, allow_dentist_quote_requests: e.target.checked })}
                          className="w-5 h-5 text-cyan-600 border-slate-300 rounded focus:ring-2 focus:ring-cyan-500 mt-0.5"
                        />
                        <label htmlFor="allow_dentist_quote_requests" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <FileQuestion className="w-4 h-4 text-cyan-600" />
                            <span className="text-sm sm:text-base font-bold text-slate-900">Autoriser les demandes de devis</span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600">Les dentistes pourront demander des devis avant de passer commande</p>
                        </label>
                      </div>

                      <div>
                        <label htmlFor="dentist_portal_message" className="block text-xs sm:text-sm font-bold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                          Message d'accueil pour les dentistes
                        </label>
                        <textarea
                          id="dentist_portal_message"
                          rows={3}
                          value={dentistSettings.dentist_portal_message}
                          onChange={(e) => setDentistSettings({ ...dentistSettings, dentist_portal_message: e.target.value })}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 text-sm sm:text-base border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-blue-300 resize-none"
                          placeholder="Bienvenue sur notre portail ! N'hésitez pas à nous contacter pour toute question."
                        />
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                          Ce message sera affiché aux dentistes lorsqu'ils accèdent à votre portail
                        </p>
                      </div>

                      <div className="flex justify-end pt-3 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={handleDentistSettingsSubmit}
                          disabled={loading}
                          className="group relative flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 text-white shadow-lg hover:shadow-xl rounded-lg sm:rounded-xl hover:from-blue-700 hover:via-cyan-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold bg-[length:200%_100%] hover:bg-[position:100%_0]"
                        >
                          <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                          {loading ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {success && (
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex items-center gap-2 sm:gap-3 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                      <Save className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-bold text-emerald-900">Modifications enregistrées</p>
                      <p className="text-xs sm:text-sm text-emerald-700 mt-0.5">Vos paramètres ont été mis à jour avec succès</p>
                    </div>
                  </div>
                )}

                <div className="relative pt-4 sm:pt-6 border-t border-slate-200">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 text-sm sm:text-base lg:text-lg bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 text-white shadow-xl hover:shadow-2xl rounded-xl sm:rounded-2xl hover:from-primary-700 hover:via-cyan-700 hover:to-primary-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold bg-[length:200%_100%] hover:bg-[position:100%_0] hover:scale-[1.02]"
                    >
                      <Save className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform duration-300" />
                      <span className="hidden sm:inline">{loading ? 'Enregistrement en cours...' : 'Enregistrer les modifications'}</span>
                      <span className="sm:hidden">{loading ? 'Enregistrer...' : 'Enregistrer'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/50 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Résumé du profil</h3>
              </div>
              <div className="space-y-2.5 sm:space-y-3">
                <div className="bg-gradient-to-br from-slate-50 to-white p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-200/50">
                  <p className="text-xs font-medium text-slate-500 mb-1">Utilisateur</p>
                  <p className="text-sm font-bold text-slate-900 break-words">{profile?.first_name} {profile?.last_name}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-white p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-200/50">
                  <p className="text-xs font-medium text-slate-500 mb-1">Laboratoire</p>
                  <p className="text-sm font-bold text-slate-900 break-words">{profile?.laboratory_name}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-white p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-200/50">
                  <p className="text-xs font-medium text-slate-500 mb-1">Email</p>
                  <p className="text-sm font-bold text-slate-900 break-all">{userEmail}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary-50 via-cyan-50 to-white rounded-2xl sm:rounded-3xl shadow-xl border border-primary-200/50 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                  <Save className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Conseils</h3>
              </div>
              <ul className="space-y-2.5 sm:space-y-3">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></span>
                  <p className="text-xs sm:text-sm text-slate-700">Ajoutez votre logo pour personnaliser vos documents</p>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></span>
                  <p className="text-xs sm:text-sm text-slate-700">Complétez vos coordonnées pour faciliter les communications</p>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></span>
                  <p className="text-xs sm:text-sm text-slate-700">Vos informations apparaîtront sur tous vos documents</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function ReferralSection() {
  const { profile, user, userProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState<{
    totalReferrals: number;
    pendingRewards: number;
    appliedRewards: number;
  }>({ totalReferrals: 0, pendingRewards: 0, appliedRewards: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralStats();
  }, [user]);

  const loadReferralStats = async () => {
    if (!user) return;

    try {
      const { supabase } = await import('../../lib/supabase');

      // Load referral code from user_profiles
      const { data: userProfileData } = await supabase
        .from('user_profiles')
        .select('referral_code')
        .eq('id', user.id)
        .maybeSingle();

      setReferralCode(userProfileData?.referral_code || null);

      // Load referrals count
      const { count: referralsCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id);

      // Load rewards
      const { data: rewards } = await supabase
        .from('referral_rewards')
        .select('status, days_added')
        .eq('user_id', user.id)
        .eq('reward_type', 'referrer_bonus');

      const pending = rewards?.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.days_added, 0) || 0;
      const applied = rewards?.filter(r => r.status === 'applied').reduce((sum, r) => sum + r.days_added, 0) || 0;

      setReferralStats({
        totalReferrals: referralsCount || 0,
        pendingRewards: pending,
        appliedRewards: applied
      });
    } catch (error) {
      console.error('Error loading referral stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const referralUrl = referralCode
    ? `${window.location.origin}/register?ref=${referralCode}`
    : '';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!referralCode) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Gift className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">Chargement de vos informations d'affiliation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">Programme d'affiliation</h2>
            <p className="text-purple-100">Parrainez vos amis et gagnez des mois gratuits</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Gift className="w-8 h-8" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="text-2xl font-bold mb-1">{referralStats.totalReferrals}</div>
            <div className="text-sm text-purple-100">Parrainages réussis</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="text-2xl font-bold mb-1">{referralStats.pendingRewards}</div>
            <div className="text-sm text-purple-100">Jours en attente</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="text-2xl font-bold mb-1">{referralStats.appliedRewards}</div>
            <div className="text-sm text-purple-100">Jours gagnés</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-purple-600" />
            Comment ça marche ?
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">1</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Partagez votre code</h4>
                <p className="text-sm text-slate-600">Envoyez votre code ou lien à vos amis laboratoires</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-pink-50 rounded-xl border border-pink-200">
              <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">2</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Ils s'inscrivent</h4>
                <p className="text-sm text-slate-600">Votre filleul gagne <strong>15 jours supplémentaires</strong> d'essai</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">3</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Vous gagnez 1 mois</h4>
                <p className="text-sm text-slate-600">Recevez <strong>30 jours gratuits</strong> ajoutés à votre abonnement</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <LinkIcon className="w-6 h-6 text-purple-600" />
            Partagez votre code
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Code de parrainage
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralCode}
                  readOnly
                  className="flex-1 px-4 py-3 border border-purple-200 rounded-xl bg-gradient-to-br from-white to-purple-50 shadow-sm font-mono font-bold text-purple-700 text-center text-xl tracking-wider"
                />
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Lien de parrainage complet
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralUrl}
                  readOnly
                  className="flex-1 px-4 py-3 border border-purple-200 rounded-xl bg-gradient-to-br from-white to-purple-50 shadow-sm font-mono text-sm text-purple-700"
                />
                <button
                  onClick={handleCopyUrl}
                  className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Copiez ce lien et envoyez-le directement à vos contacts
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
