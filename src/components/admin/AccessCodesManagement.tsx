import { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, Check, Clock, Key, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';

interface AccessCode {
  id: string;
  code: string;
  duration_days: number;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export function AccessCodesManagement() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    duration_days: 30,
    quantity: 1,
    expires_in_days: 0,
  });

  useLockScroll(showCreateModal);

  useEffect(() => {
    loadCodes();
  }, [user]);

  const loadCodes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error loading codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const handleCreateCodes = async () => {
    if (!user) return;

    try {
      const newCodes = [];
      for (let i = 0; i < formData.quantity; i++) {
        const code = generateCode();
        const expiresAt = formData.expires_in_days > 0
          ? new Date(Date.now() + formData.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
          : null;

        newCodes.push({
          code,
          duration_days: formData.duration_days,
          created_by: user.id,
          expires_at: expiresAt,
        });
      }

      const { error } = await supabase
        .from('access_codes')
        .insert(newCodes);

      if (error) throw error;

      setShowCreateModal(false);
      setFormData({ duration_days: 30, quantity: 1, expires_in_days: 0 });
      loadCodes();
    } catch (error) {
      console.error('Error creating codes:', error);
      alert('Erreur lors de la création des codes');
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce code ?')) return;

    try {
      const { error } = await supabase
        .from('access_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadCodes();
    } catch (error) {
      console.error('Error deleting code:', error);
      alert('Erreur lors de la suppression du code');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const durationOptions = [
    { value: 15, label: '15 jours' },
    { value: 30, label: '1 mois' },
    { value: 60, label: '2 mois' },
    { value: 90, label: '3 mois' },
    { value: 180, label: '6 mois' },
    { value: 365, label: '1 an' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Codes d'accès</h2>
          <p className="text-slate-600 mt-1">Générez des codes pour donner accès aux utilisateurs</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Générer des codes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
          <div className="flex items-center gap-3">
            <Key className="w-8 h-8 text-emerald-600" />
            <div>
              <p className="text-sm text-emerald-700">Total des codes</p>
              <p className="text-2xl font-bold text-emerald-900">{codes.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-sm text-orange-700">Disponibles</p>
              <p className="text-2xl font-bold text-orange-900">
                {codes.filter(c => !c.is_used && (!c.expires_at || new Date(c.expires_at) > new Date())).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-6 border border-cyan-200">
          <div className="flex items-center gap-3">
            <Check className="w-8 h-8 text-cyan-600" />
            <div>
              <p className="text-sm text-cyan-700">Utilisés</p>
              <p className="text-2xl font-bold text-cyan-900">{codes.filter(c => c.is_used).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Code</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Durée</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Expire le</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Créé le</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {codes.map((code) => {
                const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
                const isAvailable = !code.is_used && !isExpired;

                return (
                  <tr key={code.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <code className="bg-slate-100 px-3 py-1 rounded font-mono text-sm">
                          {code.code}
                        </code>
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                          title="Copier"
                        >
                          {copiedCode === code.code ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {code.duration_days} jours
                    </td>
                    <td className="py-3 px-4">
                      {code.is_used ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium">
                          <Check className="w-3 h-3" />
                          Utilisé
                        </span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          Expiré
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                          <Key className="w-3 h-3" />
                          Disponible
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {code.expires_at ? new Date(code.expires_at).toLocaleDateString('fr-FR') : 'Jamais'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {new Date(code.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!code.is_used && (
                        <button
                          onClick={() => handleDeleteCode(code.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Générer des codes d'accès</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Durée de l'abonnement
                </label>
                <select
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {durationOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre de codes à générer
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Expiration du code (jours)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.expires_in_days}
                  onChange={(e) => setFormData({ ...formData, expires_in_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0 = jamais"
                />
                <p className="text-xs text-slate-500 mt-1">0 = le code n'expire jamais</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateCodes}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                Générer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
