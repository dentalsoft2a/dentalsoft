import { useState } from 'react';
import { ArrowRight, User, Mail, Phone } from 'lucide-react';

interface ConfigurationStepProps {
  data?: any;
  onNext: (data: any) => void;
  isLoading?: boolean;
}

export default function ConfigurationStep({ data, onNext, isLoading }: ConfigurationStepProps) {
  const [formData, setFormData] = useState({
    dentistName: data?.dentistName || '',
    dentistEmail: data?.dentistEmail || '',
    dentistPhone: data?.dentistPhone || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuration Initiale</h2>
        <p className="text-gray-600">
          Configurez quelques paramètres pour personnaliser votre expérience.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Premier Dentiste (Optionnel)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Ajoutez un premier dentiste pour commencer à créer des bons de livraison rapidement.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Nom du dentiste
              </label>
              <input
                type="text"
                value={formData.dentistName}
                onChange={(e) => setFormData({ ...formData, dentistName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Dr. Martin Dupont"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.dentistEmail}
                  onChange={(e) => setFormData({ ...formData, dentistEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="dentiste@exemple.fr"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.dentistPhone}
                  onChange={(e) => setFormData({ ...formData, dentistPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-8">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuer
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
