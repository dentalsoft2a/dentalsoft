import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompanyLegalInfo } from '../../hooks/useCompanyLegalInfo';

export function LegalNotice() {
  const navigate = useNavigate();
  const { info, loading } = useCompanyLegalInfo();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sky-600 hover:text-sky-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Mentions Légales</h1>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Éditeur du site</h2>
              <div className="space-y-2">
                <p><strong>Raison sociale :</strong> {info.company_name}</p>
                <p><strong>Forme juridique :</strong> {info.legal_form}</p>
                <p><strong>Capital social :</strong> {info.capital.toLocaleString('fr-FR')} €</p>
                <p><strong>Siège social :</strong> {info.address}</p>
                <p><strong>SIRET :</strong> {info.siret}</p>
                <p><strong>Numéro de TVA intracommunautaire :</strong> {info.vat_number}</p>
                <p><strong>Code APE :</strong> {info.ape_code}</p>
                <p><strong>RCS :</strong> {info.rcs}</p>
                <p><strong>Téléphone :</strong> {info.phone}</p>
                <p><strong>Email :</strong> <a href={`mailto:${info.email}`} className="text-sky-600 hover:text-sky-700">{info.email}</a></p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Directeur de la publication</h2>
              <p><strong>Nom :</strong> {info.director_name}</p>
              <p><strong>Fonction :</strong> {info.director_title}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Hébergement</h2>
              <div className="space-y-2">
                <p><strong>Hébergeur :</strong> Supabase Inc.</p>
                <p><strong>Adresse :</strong> 970 Toa Payoh North, #07-04, Singapore 318992</p>
                <p><strong>Site web :</strong> <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700">https://supabase.com</a></p>
                <p className="text-sm text-gray-600 mt-2">
                  Les données sont hébergées dans l'Union Européenne conformément au RGPD.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Propriété intellectuelle</h2>
              <p className="mb-4">
                L'ensemble du contenu de ce site (structure, textes, logos, images, éléments graphiques, etc.)
                est la propriété exclusive de {info.company_name}, sauf mentions particulières.
              </p>
              <p className="mb-4">
                Toute reproduction, distribution, modification, adaptation, retransmission ou publication,
                même partielle, de ces différents éléments est strictement interdite sans l'accord écrit préalable
                de {info.company_name}.
              </p>
              <p>
                Cette interdiction s'étend aux contenus mis à disposition des utilisateurs.
                Toute utilisation non autorisée du site ou de l'un de ses éléments sera considérée comme
                constitutive d'une contrefaçon et poursuivie conformément aux dispositions des articles
                L.335-2 et suivants du Code de Propriété Intellectuelle.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Données personnelles</h2>
              <p className="mb-4">
                Le traitement de vos données personnelles est effectué conformément au Règlement Général
                sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.
              </p>
              <p className="mb-4">
                Pour plus d'informations sur la collecte et le traitement de vos données personnelles,
                veuillez consulter notre <a href="/privacy-policy" className="text-sky-600 hover:text-sky-700 underline">Politique de Confidentialité</a>.
              </p>
              <p>
                <strong>Responsable du traitement :</strong> {info.company_name}<br />
                <strong>Délégué à la Protection des Données (DPO) :</strong> {info.dpo_name} - <a href={`mailto:${info.dpo_email}`} className="text-sky-600 hover:text-sky-700">{info.dpo_email}</a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Cookies</h2>
              <p className="mb-4">
                Ce site utilise des cookies essentiels au bon fonctionnement du service.
                Pour plus d'informations, consultez notre <a href="/privacy-policy#cookies" className="text-sky-600 hover:text-sky-700 underline">politique en matière de cookies</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Limitations de responsabilité</h2>
              <p className="mb-4">
                {info.company_name} s'efforce d'assurer l'exactitude et la mise à jour des informations
                diffusées sur ce site. Toutefois, {info.company_name} ne peut garantir l'exactitude,
                la précision ou l'exhaustivité des informations mises à disposition sur ce site.
              </p>
              <p className="mb-4">
                {info.company_name} ne pourra être tenu responsable des dommages directs ou indirects
                résultant de l'utilisation de ce site ou d'autres sites qui lui sont liés.
              </p>
              <p>
                L'utilisateur reconnaît utiliser ces informations sous sa responsabilité exclusive.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Droit applicable et juridiction compétente</h2>
              <p className="mb-4">
                Les présentes mentions légales sont régies par le droit français.
              </p>
              <p>
                En cas de litige et à défaut d'accord amiable, le litige sera porté devant les
                tribunaux français conformément aux règles de compétence en vigueur.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Contact</h2>
              <p className="mb-4">
                Pour toute question concernant les présentes mentions légales, vous pouvez nous contacter :
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Par email : <a href={`mailto:${info.email}`} className="text-sky-600 hover:text-sky-700">{info.email}</a></li>
                <li>Par téléphone : {info.phone}</li>
                <li>Par courrier : {info.address}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Crédits</h2>
              <p className="mb-4">
                Ce site utilise les technologies et bibliothèques open-source suivantes :
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>React - <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700">https://react.dev</a></li>
                <li>Vite - <a href="https://vitejs.dev" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700">https://vitejs.dev</a></li>
                <li>Supabase - <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700">https://supabase.com</a></li>
                <li>Tailwind CSS - <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700">https://tailwindcss.com</a></li>
                <li>Lucide Icons - <a href="https://lucide.dev" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700">https://lucide.dev</a></li>
              </ul>
            </section>

            <div className="mt-8 pt-8 border-t border-gray-200 text-sm text-gray-500">
              <p>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
