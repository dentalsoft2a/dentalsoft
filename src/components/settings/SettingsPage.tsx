import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Upload, X, User, Building2, Mail, Phone, MapPin, Image } from 'lucide-react';

export default function SettingsPage() {
  const { profile, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    laboratory_name: profile?.laboratory_name || '',
    laboratory_email: profile?.laboratory_email || '',
    laboratory_phone: profile?.laboratory_phone || '',
    laboratory_address: profile?.laboratory_address || '',
    laboratory_logo_url: profile?.laboratory_logo_url || '',
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
      });
      setLogoPreview(profile.laboratory_logo_url || '');
    }
  }, [profile]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 bg-clip-text text-transparent">Paramètres</h1>
          <p className="text-slate-600 mt-3 text-lg">Gérez les informations de votre laboratoire</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200/50 hover:shadow-2xl transition-all duration-300 overflow-hidden">
              <div className="relative p-8 border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-cyan-50/20 backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-cyan-500/5"></div>
                <div className="relative flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Informations du compte</h2>
                    <p className="text-sm text-slate-600 mt-1">Gérez vos informations personnelles et professionnelles</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-200/50 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
                    Informations personnelles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4 text-primary-600" />
                        Prénom
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full px-4 py-3.5 border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-primary-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4 text-cyan-600" />
                        Nom
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full px-4 py-3.5 border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-cyan-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-200/50 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
                    Informations du laboratoire
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary-600" />
                        Nom du laboratoire
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.laboratory_name}
                        onChange={(e) => setFormData({ ...formData, laboratory_name: e.target.value })}
                        className="w-full px-4 py-3.5 border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-primary-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Image className="w-4 h-4 text-cyan-600" />
                        Logo du laboratoire
                      </label>
                      <div className="space-y-4">
                        {logoPreview ? (
                          <div className="relative inline-block group">
                            <img
                              src={logoPreview}
                              alt="Logo du laboratoire"
                              className="h-32 w-auto object-contain border-2 border-primary-200 rounded-2xl p-4 bg-white shadow-lg group-hover:shadow-xl transition-all duration-300"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="absolute -top-3 -right-3 p-2 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl hover:scale-110"
                              title="Supprimer le logo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-gradient-to-br from-slate-50 to-white hover:border-primary-300 transition-all duration-300">
                            <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <Upload className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-600 mb-1">Aucun logo téléchargé</p>
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
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-50 to-cyan-50 border-2 border-primary-200 text-primary-700 rounded-xl hover:from-primary-100 hover:to-cyan-100 hover:border-primary-300 transition-all duration-300 cursor-pointer font-semibold shadow-sm hover:shadow-md"
                          >
                            <Upload className="w-5 h-5" />
                            {logoPreview ? 'Changer le logo' : 'Télécharger un logo'}
                          </label>
                          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                            Format : PNG, JPG, GIF • Taille max : 2 MB
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary-600" />
                        Email du laboratoire
                      </label>
                      <input
                        type="email"
                        value={formData.laboratory_email}
                        onChange={(e) => setFormData({ ...formData, laboratory_email: e.target.value })}
                        className="w-full px-4 py-3.5 border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-primary-300"
                        placeholder="contact@laboratoire.fr"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-cyan-600" />
                        Téléphone du laboratoire
                      </label>
                      <input
                        type="tel"
                        value={formData.laboratory_phone}
                        onChange={(e) => setFormData({ ...formData, laboratory_phone: e.target.value })}
                        className="w-full px-4 py-3.5 border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-cyan-300"
                        placeholder="+33 1 23 45 67 89"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary-600" />
                        Adresse du laboratoire
                      </label>
                      <textarea
                        rows={3}
                        value={formData.laboratory_address}
                        onChange={(e) => setFormData({ ...formData, laboratory_address: e.target.value })}
                        className="w-full px-4 py-3.5 border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-primary-300 resize-none"
                        placeholder="123 Rue Example&#10;75001 Paris, France"
                      />
                    </div>
                  </div>
                </div>

                {success && (
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-2xl p-5 flex items-center gap-3 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                      <Save className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-900">Modifications enregistrées</p>
                      <p className="text-sm text-emerald-700 mt-0.5">Vos paramètres ont été mis à jour avec succès</p>
                    </div>
                  </div>
                )}

                <div className="relative pt-6 border-t border-slate-200">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 text-white shadow-xl hover:shadow-2xl rounded-2xl hover:from-primary-700 hover:via-cyan-700 hover:to-primary-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg bg-[length:200%_100%] hover:bg-[position:100%_0] hover:scale-[1.02]"
                    >
                      <Save className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                      {loading ? 'Enregistrement en cours...' : 'Enregistrer les modifications'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200/50 p-6 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Résumé du profil</h3>
              </div>
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200/50">
                  <p className="text-xs font-medium text-slate-500 mb-1">Utilisateur</p>
                  <p className="text-sm font-bold text-slate-900">{profile?.first_name} {profile?.last_name}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200/50">
                  <p className="text-xs font-medium text-slate-500 mb-1">Laboratoire</p>
                  <p className="text-sm font-bold text-slate-900">{profile?.laboratory_name}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200/50">
                  <p className="text-xs font-medium text-slate-500 mb-1">Email</p>
                  <p className="text-sm font-bold text-slate-900 break-all">{profile?.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary-50 via-cyan-50 to-white rounded-3xl shadow-xl border border-primary-200/50 p-6 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Save className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Conseils</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                  <p className="text-sm text-slate-700">Ajoutez votre logo pour personnaliser vos documents</p>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-2 flex-shrink-0"></span>
                  <p className="text-sm text-slate-700">Complétez vos coordonnées pour faciliter les communications</p>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                  <p className="text-sm text-slate-700">Vos informations apparaîtront sur tous vos documents</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
