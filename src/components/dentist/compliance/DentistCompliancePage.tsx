import { useState } from 'react';
import { Shield, FileText, Calendar, Award } from 'lucide-react';
import DentistComplianceCertificate from './DentistComplianceCertificate';
import DentistFiscalPeriodsManager from './DentistFiscalPeriodsManager';
import DentistAuditLogViewer from './DentistAuditLogViewer';

type TabType = 'certificate' | 'periods' | 'audit';

export default function DentistCompliancePage() {
  const [activeTab, setActiveTab] = useState<TabType>('certificate');

  const tabs = [
    {
      id: 'certificate' as TabType,
      name: 'Attestation de Conformité',
      icon: Award,
      description: 'Téléchargez votre attestation anti-fraude TVA'
    },
    {
      id: 'periods' as TabType,
      name: 'Périodes Fiscales',
      icon: Calendar,
      description: 'Gérez et clôturez vos périodes comptables'
    },
    {
      id: 'audit' as TabType,
      name: 'Journal d\'Audit',
      icon: FileText,
      description: 'Consultez le journal inaltérable des opérations'
    }
  ];

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Conformité & Audit</h1>
              <p className="text-slate-600">Système anti-fraude TVA conforme à l'article 286 du CGI</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-2 overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      group relative min-w-fit px-4 py-3 flex items-center gap-2
                      border-b-2 font-medium text-sm transition-all
                      ${isActive
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-green-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <div className="text-left">
                      <div className={`font-semibold ${isActive ? 'text-green-700' : ''}`}>
                        {tab.name}
                      </div>
                      <div className="text-xs text-slate-500 hidden md:block">
                        {tab.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'certificate' && <DentistComplianceCertificate />}
          {activeTab === 'periods' && <DentistFiscalPeriodsManager />}
          {activeTab === 'audit' && <DentistAuditLogViewer />}
        </div>

        {/* Info Footer */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700">
              <p className="font-semibold mb-1">Pourquoi la conformité anti-fraude TVA est-elle importante ?</p>
              <p className="text-slate-600">
                L'article 286 du Code Général des Impôts impose aux professionnels assujettis à la TVA d'utiliser un logiciel
                de caisse ou de gestion sécurisé et certifié. DentalCloud respecte toutes les exigences d'inaltérabilité, de
                sécurisation, de conservation et d'archivage. Vous pouvez présenter votre attestation lors d'un contrôle fiscal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
