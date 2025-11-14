import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPolicy() {
  const navigate = useNavigate();

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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Politique de Confidentialité</h1>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="mb-4">
                La présente politique de confidentialité décrit comment [Nom de votre société] collecte,
                utilise, partage et protège vos données personnelles dans le cadre de l'utilisation de
                DentalCloud, notre application de gestion pour laboratoires dentaires.
              </p>
              <p className="mb-4">
                Nous nous engageons à protéger votre vie privée et à traiter vos données personnelles
                conformément au Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679)
                et à la loi Informatique et Libertés modifiée.
              </p>
              <p>
                <strong>Responsable du traitement :</strong> [Nom de votre société]<br />
                <strong>Contact :</strong> [contact@votresociete.fr]<br />
                <strong>Délégué à la Protection des Données (DPO) :</strong> [dpo@votresociete.fr]
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Données personnelles collectées</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2.1 Données des laboratoires dentaires</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Raison sociale du laboratoire</li>
                    <li>Adresse professionnelle</li>
                    <li>Numéro SIRET</li>
                    <li>Numéro RCS</li>
                    <li>Coordonnées de contact (email, téléphone)</li>
                    <li>Informations bancaires (IBAN, BIC) pour la facturation</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2.2 Données des utilisateurs</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Nom et prénom</li>
                    <li>Adresse email professionnelle</li>
                    <li>Mot de passe (chiffré)</li>
                    <li>Rôle et permissions dans l'application</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2.3 Données des dentistes (clients B2B)</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Nom et prénom du praticien</li>
                    <li>Adresse du cabinet dentaire</li>
                    <li>Coordonnées professionnelles (email, téléphone)</li>
                    <li>Numéro SIRET (si applicable)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2.4 Données des patients (limitées)</h3>
                  <p className="mb-2 text-sm text-gray-600">
                    Nous collectons uniquement le nom du patient pour l'identification des bons de livraison et factures.
                    Aucune donnée médicale sensible n'est collectée.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Nom du patient (mention sur bon de livraison)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2.5 Données techniques</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Adresse IP</li>
                    <li>Type de navigateur et version</li>
                    <li>Système d'exploitation</li>
                    <li>Pages visitées et actions effectuées</li>
                    <li>Dates et heures de connexion</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Finalités du traitement</h2>

              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900">3.1 Gestion du service</h3>
                  <p className="text-sm">Création et gestion de votre compte, authentification, support technique</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">3.2 Gestion commerciale</h3>
                  <p className="text-sm">Édition de bons de livraison, proformas, factures et avoirs</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">3.3 Gestion comptable</h3>
                  <p className="text-sm">Facturation, paiements, conformité anti-fraude TVA (Article 286 du CGI)</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">3.4 Obligations légales</h3>
                  <p className="text-sm">Conservation des documents comptables (6 ans), audit fiscal, traçabilité</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">3.5 Sécurité et prévention de la fraude</h3>
                  <p className="text-sm">Détection des accès non autorisés, journalisation des actions, intégrité des données</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">3.6 Amélioration du service</h3>
                  <p className="text-sm">Analyse d'utilisation, correction de bugs, développement de nouvelles fonctionnalités</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Base légale du traitement</h2>

              <ul className="space-y-2">
                <li><strong>Exécution du contrat :</strong> Gestion de votre abonnement et fourniture du service</li>
                <li><strong>Obligation légale :</strong> Conservation des factures et documents comptables (Code de Commerce, Article 286 du CGI)</li>
                <li><strong>Intérêt légitime :</strong> Gestion de la relation client B2B, sécurité du service, prévention de la fraude</li>
                <li><strong>Consentement :</strong> Cookies non essentiels (si applicable)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Destinataires des données</h2>

              <div className="space-y-3">
                <p>Vos données personnelles sont destinées :</p>

                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Personnels autorisés de [Nom de votre société]</strong> : Équipes techniques, support client, service commercial</li>
                  <li><strong>Supabase Inc.</strong> : Hébergement et infrastructure (données hébergées en Union Européenne)</li>
                  <li><strong>Prestataires de paiement</strong> : Stripe (si applicable) pour le traitement des paiements</li>
                  <li><strong>Autorités fiscales</strong> : En cas de contrôle fiscal (obligation légale)</li>
                  <li><strong>Autorités judiciaires</strong> : Sur réquisition judiciaire</li>
                </ul>

                <p className="text-sm text-gray-600 mt-4">
                  Nous ne vendons, ne louons et ne partageons jamais vos données personnelles à des tiers
                  à des fins commerciales ou marketing.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Transferts de données hors UE</h2>

              <p className="mb-4">
                Vos données sont hébergées au sein de l'Union Européenne par Supabase.
                Aucun transfert de données en dehors de l'UE n'est effectué, sauf :
              </p>

              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Avec votre consentement explicite</li>
                <li>Vers des pays bénéficiant d'une décision d'adéquation de la Commission Européenne</li>
                <li>Avec des garanties appropriées (clauses contractuelles types de l'UE)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Durée de conservation</h2>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left">Type de données</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Durée de conservation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Compte utilisateur actif</td>
                      <td className="border border-gray-300 px-4 py-2">Durée de l'abonnement + 1 an</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Factures et documents comptables</td>
                      <td className="border border-gray-300 px-4 py-2">6 ans minimum (obligation légale)</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Journal d'audit anti-fraude</td>
                      <td className="border border-gray-300 px-4 py-2">6 ans minimum (Article 286 du CGI)</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Logs de connexion</td>
                      <td className="border border-gray-300 px-4 py-2">1 an</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Données de contact dentistes</td>
                      <td className="border border-gray-300 px-4 py-2">3 ans après dernière commande</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Sécurité des données</h2>

              <p className="mb-4">
                Nous mettons en œuvre toutes les mesures techniques et organisationnelles appropriées
                pour protéger vos données personnelles :
              </p>

              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Chiffrement :</strong> HTTPS/TLS 1.3 pour les transmissions, AES-256 pour le stockage des archives</li>
                <li><strong>Authentification :</strong> Authentification forte avec validation d'email</li>
                <li><strong>Contrôle d'accès :</strong> Row Level Security (RLS) PostgreSQL, principe du moindre privilège</li>
                <li><strong>Journalisation :</strong> Traçabilité complète des accès et actions</li>
                <li><strong>Sauvegarde :</strong> Sauvegardes quotidiennes automatiques chiffrées</li>
                <li><strong>Signature électronique :</strong> Signature RSA-4096 des factures</li>
                <li><strong>Conformité anti-fraude :</strong> Journal d'audit inaltérable avec chaînage cryptographique</li>
              </ul>
            </section>

            <section id="cookies">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Cookies et technologies similaires</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">9.1 Cookies essentiels</h3>
                  <p className="text-sm mb-2">
                    Ces cookies sont nécessaires au fonctionnement du site. Ils ne peuvent pas être désactivés.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                    <li><strong>Cookies de session :</strong> Maintien de votre connexion (supabase.auth.token)</li>
                    <li><strong>Cookies de sécurité :</strong> Protection CSRF</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">9.2 Cookies non essentiels</h3>
                  <p className="text-sm text-gray-600">
                    DentalCloud n'utilise actuellement aucun cookie de suivi, analytique ou publicitaire.
                    Si cela devait changer, nous vous demanderions votre consentement préalable.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">9.3 Gestion des cookies</h3>
                  <p className="text-sm">
                    Vous pouvez configurer votre navigateur pour refuser les cookies ou vous avertir
                    lorsqu'un cookie est déposé. Notez que la désactivation des cookies essentiels
                    empêchera le bon fonctionnement de l'application.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Vos droits RGPD</h2>

              <p className="mb-4">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>

              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900">Droit d'accès (Article 15)</h3>
                  <p className="text-sm">Obtenir une copie de vos données personnelles</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Droit de rectification (Article 16)</h3>
                  <p className="text-sm">Corriger vos données inexactes ou incomplètes</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Droit à l'effacement (Article 17)</h3>
                  <p className="text-sm">Demander la suppression de vos données (sous réserve des obligations légales de conservation)</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Droit à la limitation (Article 18)</h3>
                  <p className="text-sm">Limiter le traitement de vos données dans certaines situations</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Droit à la portabilité (Article 20)</h3>
                  <p className="text-sm">Recevoir vos données dans un format structuré et lisible par machine</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Droit d'opposition (Article 21)</h3>
                  <p className="text-sm">S'opposer au traitement de vos données pour des raisons légitimes</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Droit de retirer votre consentement</h3>
                  <p className="text-sm">Retirer votre consentement à tout moment pour les traitements basés sur le consentement</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Droit de définir des directives post-mortem</h3>
                  <p className="text-sm">Définir des directives sur le sort de vos données après votre décès</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-sky-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Comment exercer vos droits ?</h3>
                <p className="text-sm mb-3">
                  Pour exercer vos droits, vous pouvez :
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                  <li>Accéder à l&apos;interface &quot;Paramètres&quot; &gt; &quot;Mes données RGPD&quot; dans votre compte</li>
                  <li>Nous contacter par email : <a href="mailto:[dpo@votresociete.fr]" className="text-sky-600 hover:text-sky-700">[dpo@votresociete.fr]</a></li>
                  <li>Nous écrire : [Adresse postale complète]</li>
                </ul>
                <p className="text-sm mt-3 text-gray-600">
                  Nous vous répondrons dans un délai maximum d'un mois à compter de la réception de votre demande.
                  Une pièce d'identité pourra être demandée pour vérifier votre identité.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Réclamation auprès de la CNIL</h2>

              <p className="mb-4">
                Si vous estimez que vos droits ne sont pas respectés, vous avez le droit d'introduire
                une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) :
              </p>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p><strong>CNIL</strong></p>
                <p>3 Place de Fontenoy</p>
                <p>TSA 80715</p>
                <p>75334 PARIS CEDEX 07</p>
                <p>Téléphone : 01 53 73 22 22</p>
                <p>Site web : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700">https://www.cnil.fr</a></p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Modifications de la politique de confidentialité</h2>

              <p className="mb-4">
                Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment.
                Toute modification sera publiée sur cette page avec une nouvelle date de mise à jour.
              </p>
              <p>
                En cas de modification substantielle, nous vous en informerons par email ou par notification
                dans l'application au moins 30 jours avant l'entrée en vigueur des modifications.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Contact</h2>

              <p className="mb-4">
                Pour toute question concernant cette politique de confidentialité ou le traitement
                de vos données personnelles, vous pouvez nous contacter :
              </p>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p><strong>Responsable du traitement :</strong> [Nom de votre société]</p>
                <p><strong>Délégué à la Protection des Données :</strong> [Nom du DPO]</p>
                <p><strong>Email DPO :</strong> <a href="mailto:[dpo@votresociete.fr]" className="text-sky-600 hover:text-sky-700">[dpo@votresociete.fr]</a></p>
                <p><strong>Email général :</strong> <a href="mailto:[contact@votresociete.fr]" className="text-sky-600 hover:text-sky-700">[contact@votresociete.fr]</a></p>
                <p><strong>Téléphone :</strong> [Numéro de téléphone]</p>
                <p><strong>Adresse :</strong> [Adresse postale complète]</p>
              </div>
            </section>

            <div className="mt-8 pt-8 border-t border-gray-200 text-sm text-gray-500">
              <p><strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR')}</p>
              <p className="mt-2"><strong>Version :</strong> 1.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
