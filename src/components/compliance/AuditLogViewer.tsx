import { useState, useEffect } from 'react';
import { Search, Download, Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AuditEntry {
  id: string;
  sequence_number: number;
  created_at: string;
  entity_type: string;
  entity_id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  hash_sha256: string;
  previous_hash: string | null;
  is_sealed: boolean;
  user_id: string | null;
}

interface IntegrityCheck {
  sequence_number: number;
  is_valid: boolean;
  calculated_hash: string;
  stored_hash: string;
  entity_type: string;
  operation: string;
  created_at: string;
}

export function AuditLogViewer() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterOperation, setFilterOperation] = useState<string>('all');
  const [integrityStatus, setIntegrityStatus] = useState<'unchecked' | 'checking' | 'valid' | 'invalid'>('unchecked');
  const [integrityResults, setIntegrityResults] = useState<IntegrityCheck[]>([]);

  useEffect(() => {
    loadAuditLog();
  }, [filterType, filterOperation]);

  const loadAuditLog = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('audit_log')
        .select('*')
        .eq('laboratory_id', user.id)
        .order('sequence_number', { ascending: false })
        .limit(100);

      if (filterType !== 'all') {
        query = query.eq('entity_type', filterType);
      }

      if (filterOperation !== 'all') {
        query = query.eq('operation', filterOperation);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error loading audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyIntegrity = async () => {
    setIntegrityStatus('checking');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .rpc('verify_audit_chain', {
          p_laboratory_id: user.id,
          p_limit: 1000,
        });

      if (error) throw error;

      setIntegrityResults(data || []);

      const hasInvalid = data?.some((r: IntegrityCheck) => !r.is_valid);
      setIntegrityStatus(hasInvalid ? 'invalid' : 'valid');
    } catch (error) {
      console.error('Error verifying integrity:', error);
      setIntegrityStatus('invalid');
    }
  };

  const exportAuditLog = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('laboratory_id', user.id)
        .order('sequence_number', { ascending: true })
        .csv();

      if (error) throw error;

      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      console.error('Error exporting audit log:', error);
      alert('Erreur lors de l\'export');
    }
  };

  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true;
    return (
      entry.entity_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.hash_sha256.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case 'invoices':
        return 'Facture';
      case 'credit_notes':
        return 'Avoir';
      case 'proformas':
        return 'Proforma';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-primary-50 to-cyan-50 rounded-xl p-6 border border-primary-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Journal d'Audit Inaltérable</h3>
            <p className="text-sm text-slate-600 mb-4">
              Toutes les opérations sur vos factures et avoirs sont enregistrées de manière chronologique et sécurisée.
              Ce journal est protégé par un chaînage cryptographique garantissant son intégrité.
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={verifyIntegrity}
                disabled={integrityStatus === 'checking'}
                className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {integrityStatus === 'checking' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Vérification...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Vérifier l'intégrité
                  </>
                )}
              </button>

              {integrityStatus === 'valid' && (
                <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                  <CheckCircle className="w-5 h-5" />
                  Chaîne d'audit intègre ({integrityResults.length} enregistrements vérifiés)
                </div>
              )}

              {integrityStatus === 'invalid' && (
                <div className="flex items-center gap-2 text-red-700 text-sm font-medium">
                  <XCircle className="w-5 h-5" />
                  Rupture de chaîne détectée ! Contactez le support
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par ID, type ou hash..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          >
            <option value="all">Tous les types</option>
            <option value="invoices">Factures</option>
            <option value="credit_notes">Avoirs</option>
            <option value="proformas">Proformas</option>
          </select>

          <select
            value={filterOperation}
            onChange={(e) => setFilterOperation(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          >
            <option value="all">Toutes les opérations</option>
            <option value="CREATE">Création</option>
            <option value="UPDATE">Modification</option>
            <option value="DELETE">Suppression</option>
          </select>

          <button
            onClick={exportAuditLog}
            className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Liste des entrées */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Séquence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Date/Heure
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Opération
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Hash SHA-256
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Aucune entrée d'audit trouvée
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-slate-900">
                        #{entry.sequence_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-900">
                        {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(entry.created_at).toLocaleTimeString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-900">
                        {getEntityTypeLabel(entry.entity_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getOperationColor(entry.operation)}`}>
                        {entry.operation}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-slate-600" title={entry.hash_sha256}>
                        {entry.hash_sha256.substring(0, 16)}...
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.is_sealed ? (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-700">
                          <CheckCircle className="w-3 h-3" />
                          Scellé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <AlertTriangle className="w-3 h-3" />
                          En attente
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Résultats de vérification d'intégrité */}
      {integrityResults.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h4 className="font-semibold text-slate-900 mb-4">Détails de la vérification d'intégrité</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {integrityResults.slice(0, 10).map((result) => (
              <div
                key={result.sequence_number}
                className={`p-3 rounded-lg border ${
                  result.is_valid
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.is_valid ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium text-slate-900">
                      Séquence #{result.sequence_number}
                    </span>
                    <span className="text-xs text-slate-500">
                      {result.entity_type} - {result.operation}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(result.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
                {!result.is_valid && (
                  <div className="mt-2 text-xs text-red-700">
                    <div>Hash calculé: {result.calculated_hash.substring(0, 32)}...</div>
                    <div>Hash stocké: {result.stored_hash.substring(0, 32)}...</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
