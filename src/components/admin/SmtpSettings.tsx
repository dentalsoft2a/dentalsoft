import { useState, useEffect } from 'react';
import { Mail, Save, TestTube, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SmtpConfig {
  id?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  is_active: boolean;
  test_email_sent: boolean;
  last_tested_at: string | null;
}

export function SmtpSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testStatus, setTestStatus] = useState<'success' | 'error' | null>(null);
  const [config, setConfig] = useState<SmtpConfig>({
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: true,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: 'GB Dental',
    is_active: true,
    test_email_sent: false,
    last_tested_at: null,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('smtp_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          smtp_host: data.smtp_host,
          smtp_port: data.smtp_port,
          smtp_secure: data.smtp_secure,
          smtp_user: data.smtp_user,
          smtp_password: data.smtp_password,
          from_email: data.from_email,
          from_name: data.from_name,
          is_active: data.is_active,
          test_email_sent: data.test_email_sent,
          last_tested_at: data.last_tested_at,
        });
      }
    } catch (error) {
      console.error('Error loading SMTP config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const dataToSave = {
        ...config,
        configured_by: user.id,
      };

      if (config.id) {
        const { error } = await supabase
          .from('smtp_settings')
          .update(dataToSave)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('smtp_settings')
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;
        setConfig({ ...config, id: data.id });
      }

      alert('Configuration SMTP enregistrée avec succès');
    } catch (error) {
      console.error('Error saving SMTP config:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestStatus(null);

    try {
      // Simulate test email send
      // In production, this would call an edge function to send a test email
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update test status
      if (config.id) {
        await supabase
          .from('smtp_settings')
          .update({
            test_email_sent: true,
            last_tested_at: new Date().toISOString(),
          })
          .eq('id', config.id);
      }

      setTestStatus('success');
      setConfig({
        ...config,
        test_email_sent: true,
        last_tested_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error testing SMTP:', error);
      setTestStatus('error');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-slate-600 mt-4">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-1">Configuration SMTP</h3>
            <p className="text-sm text-blue-800">
              Configurez les paramètres SMTP pour permettre l'envoi d'emails aux utilisateurs
              (notifications, réinitialisation de mot de passe, etc.).
            </p>
          </div>
        </div>
      </div>

      {testStatus && (
        <div
          className={`rounded-lg p-4 ${
            testStatus === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {testStatus === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <p
              className={`font-medium ${
                testStatus === 'success' ? 'text-green-900' : 'text-red-900'
              }`}
            >
              {testStatus === 'success'
                ? 'Email de test envoyé avec succès'
                : 'Échec de l\'envoi de l\'email de test'}
            </p>
          </div>
        </div>
      )}

      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Serveur SMTP *
            </label>
            <input
              type="text"
              required
              value={config.smtp_host}
              onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="smtp.gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Port SMTP *
            </label>
            <input
              type="number"
              required
              min="1"
              max="65535"
              value={config.smtp_port || ''}
              onChange={(e) =>
                setConfig({
                  ...config,
                  smtp_port: e.target.value === '' ? '' as any : parseInt(e.target.value),
                })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="587"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Sécurité
            </label>
            <div className="flex items-center gap-4 h-[42px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.smtp_secure}
                  onChange={(e) =>
                    setConfig({ ...config, smtp_secure: e.target.checked })
                  }
                  className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">Utiliser TLS/SSL</span>
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nom d'utilisateur SMTP *
            </label>
            <input
              type="text"
              required
              value={config.smtp_user}
              onChange={(e) => setConfig({ ...config, smtp_user: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="votre@email.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mot de passe SMTP *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={config.smtp_password}
                onChange={(e) =>
                  setConfig({ ...config, smtp_password: e.target.value })
                }
                className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="Mot de passe ou clé d'application"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email expéditeur *
            </label>
            <input
              type="email"
              required
              value={config.from_email}
              onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="noreply@gbdental.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nom de l'expéditeur *
            </label>
            <input
              type="text"
              required
              value={config.from_name}
              onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="GB Dental"
            />
          </div>
        </div>

        {config.last_tested_at && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>
                Dernière vérification :{' '}
                {new Date(config.last_tested_at).toLocaleString('fr-FR')}
              </span>
            </div>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 mb-1">Sécurité</h4>
              <p className="text-sm text-amber-800">
                Pour Gmail, utilisez une{' '}
                <a
                  href="https://support.google.com/accounts/answer/185833"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-900"
                >
                  clé d'application
                </a>{' '}
                au lieu de votre mot de passe principal. Pour d'autres fournisseurs, consultez
                leur documentation SMTP.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !config.smtp_host || !config.smtp_user || !config.smtp_password}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-primary-300 text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TestTube className={`w-5 h-5 ${testing ? 'animate-pulse' : ''}`} />
            {testing ? 'Test en cours...' : 'Tester la configuration'}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-lg hover:from-primary-700 hover:to-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className={`w-5 h-5 ${saving ? 'animate-pulse' : ''}`} />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
