import { useState, useEffect } from 'react';
import { Building2, ArrowRight } from 'lucide-react';

interface CabinetInfoStepProps {
  data?: any;
  onNext: (data: any) => void;
  isLoading?: boolean;
}

export default function CabinetInfoStep({ data, onNext, isLoading }: CabinetInfoStepProps) {
  const [formData, setFormData] = useState({
    cabinetName: data?.cabinetName || '',
    cabinetType: data?.cabinetType || 'general',
    address: data?.address || '',
    city: data?.city || '',
    postalCode: data?.postalCode || '',
    phone: data?.phone || '',
    email: data?.email || '',
    siret: data?.siret || '',
    rpps: data?.rpps || '',
  });

  const cabinetTypes = [
    { value: 'general', label: 'Cabinet Généraliste' },
    { value: 'orthodontics', label: 'Cabinet d\'Orthodontie' },
    { value: 'implantology', label: 'Cabinet d\'Implantologie' },
    { value: 'periodontics', label: 'Cabinet de Parodontologie' },
    { value: 'pediatric', label: 'Cabinet de Pédodontie' },
    { value: 'other', label: 'Autre Spécialité' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  const isValid = formData.cabinetName && formData.cabinetType;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl mb-3">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Informations de votre Cabinet
        </h2>
        <p className="text-slate-600">
          Commençons par quelques informations de base sur votre cabinet
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Nom du Cabinet *
          </label>
          <input
            type="text"
            value={formData.cabinetName}
            onChange={(e) => setFormData({ ...formData, cabinetName: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Ex: Cabinet Dentaire Dr. Dupont"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Type de Cabinet *
          </label>
          <select
            value={formData.cabinetType}
            onChange={(e) => setFormData({ ...formData, cabinetType: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
          >
            {cabinetTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Adresse
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Numéro et nom de rue"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Code Postal
          </label>
          <input
            type="text"
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Ex: 75001"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Ville
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Ex: Paris"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Téléphone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Ex: 01 23 45 67 89"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="contact@cabinet.fr"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            SIRET
          </label>
          <input
            type="text"
            value={formData.siret}
            onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="14 chiffres"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Numéro RPPS
          </label>
          <input
            type="text"
            value={formData.rpps}
            onChange={(e) => setFormData({ ...formData, rpps: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="11 chiffres"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuer
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
