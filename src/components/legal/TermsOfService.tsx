import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TermsOfService() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Conditions Générales d'Utilisation</h1>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Objet</h2>
              <p className="mb-4">
                Les présentes Conditions Générales d'Utilisation (ci-après "CGU") ont pour objet de définir
                les modalités et conditions d'utilisation du service DentalCloud (ci-après "le Service")
                proposé par [Nom de votre société] (ci-après "l'Éditeur").
              </p>
              <p className="mb-4">
                DentalCloud est une application web de gestion destinée aux laboratoires de prothèses dentaires,
                permettant la gestion des bons de livraison, proformas, factures, avoirs, catalogues et stocks.
              </p>
              <p>
                Toute utilisation du Service implique l'acceptation sans réserve des présentes CGU.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Définitions</h2>
              <ul className="space-y-2">
                <li><strong>Service :</strong> Application web DentalCloud accessible via navigateur web</li>
                <li><strong>Utilisateur :</strong> Laboratoire de prothèses dentaires ayant souscrit un abonnement</li>
                <li><strong>Client :</strong> Personne morale ou physique utilisant le Service</li>
                <li><strong>Compte :</strong> Espace personnel sécurisé permettant l'accès au Service</li>
                <li><strong>Abonnement :</strong> Contrat d'accès au Service selon une formule tarifaire définie</li>
                <li><strong>Données :</strong> Ensemble des informations saisies et générées par l'Utilisateur</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Inscription et Accès au Service</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">3.1 Conditions d'inscription</h3>
                  <p className="mb-2">Pour s'inscrire au Service, l'Utilisateur doit :</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Être un laboratoire de prothèses dentaires en activité</li>
                    <li>Être majeur et avoir la capacité juridique de contracter</li>
                    <li>Fournir des informations exactes, complètes et à jour</li>
                    <li>Accepter les présentes CGU et la Politique de Confidentialité</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">3.2 Création du compte</h3>
                  <p className="mb-2">Lors de l'inscription, l'Utilisateur doit fournir :</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Raison sociale du laboratoire</li>
                    <li>Numéro SIRET</li>
                    <li>Adresse professionnelle complète</li>
                    <li>Adresse email valide</li>
                    <li>Mot de passe sécurisé</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">3.3 Validation du compte</h3>
                  <p>
                    Un email de confirmation sera envoyé à l'adresse indiquée. L'Utilisateur devra cliquer
                    sur le lien de validation pour activer son compte. L'Éditeur se réserve le droit de
                    refuser ou suspendre toute inscription en cas de non-conformité.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">3.4 Sécurité du compte</h3>
                  <p className="mb-2">L'Utilisateur s'engage à :</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Conserver confidentiels ses identifiants de connexion</li>
                    <li>Ne pas partager son compte avec des tiers non autorisés</li>
                    <li>Informer immédiatement l'Éditeur de toute utilisation non autorisée</li>
                    <li>Utiliser un mot de passe robuste et le modifier régulièrement</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Abonnements et Tarifs</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">4.1 Formules d'abonnement</h3>
                  <p className="mb-2">L'Éditeur propose différentes formules d'abonnement :</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Gratuit :</strong> Fonctionnalités limitées, période d'essai</li>
                    <li><strong>Starter :</strong> Fonctionnalités essentielles pour petits laboratoires</li>
                    <li><strong>Professional :</strong> Fonctionnalités complètes</li>
                    <li><strong>Enterprise :</strong> Solution sur-mesure pour grands laboratoires</li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-2">
                    Les détails des fonctionnalités par formule sont disponibles sur notre site web.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">4.2 Tarifs</h3>
                  <p className="mb-2">
                    Les tarifs des abonnements sont indiqués en euros hors taxes (HT) et toutes taxes comprises (TTC).
                    La TVA applicable est de 20% (taux en vigueur en France).
                  </p>
                  <p>
                    Les tarifs peuvent être modifiés à tout moment par l'Éditeur. Les nouveaux tarifs
                    s'appliquent au renouvellement de l'abonnement. Les Utilisateurs seront informés
                    au moins 30 jours avant l'entrée en vigueur.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">4.3 Facturation et paiement</h3>
                  <p className="mb-2">
                    La facturation est mensuelle ou annuelle selon la formule choisie.
                    Le paiement s'effectue par carte bancaire ou virement bancaire.
                  </p>
                  <p className="mb-2">
                    En cas de retard de paiement, l'accès au Service peut être suspendu après relance.
                    Des pénalités de retard au taux légal en vigueur seront appliquées.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">4.4 Période d'essai</h3>
                  <p>
                    Une période d'essai gratuite de 14 jours peut être proposée pour certaines formules.
                    Aucune carte bancaire n'est requise pendant la période d'essai. À l'issue de cette période,
                    l'Utilisateur doit souscrire un abonnement payant pour continuer à utiliser le Service.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Fonctionnalités du Service</h2>

              <div className="space-y-3">
                <p>Le Service DentalCloud offre les fonctionnalités suivantes :</p>

                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Gestion des bons de livraison</li>
                  <li>Création de proformas (devis)</li>
                  <li>Émission de factures conformes (Article 286 du CGI)</li>
                  <li>Génération d'avoirs (notes de crédit)</li>
                  <li>Gestion du catalogue de produits</li>
                  <li>Suivi des stocks de matières premières</li>
                  <li>Gestion de la relation client (dentistes)</li>
                  <li>Suivi des paiements</li>
                  <li>Tableau de bord et statistiques</li>
                  <li>Système de production par étapes</li>
                  <li>Gestion des employés et permissions</li>
                  <li>Journal d'audit anti-fraude TVA</li>
                  <li>Archivage automatique conforme (6 ans)</li>
                  <li>Signature électronique des documents</li>
                  <li>Export des données</li>
                </ul>

                <p className="text-sm text-gray-600 mt-4">
                  Certaines fonctionnalités peuvent être limitées selon la formule d'abonnement choisie.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Obligations de l'Utilisateur</h2>

              <div className="space-y-3">
                <p>L'Utilisateur s'engage à :</p>

                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Utiliser le Service de manière conforme à sa destination</li>
                  <li>Ne pas porter atteinte à l'intégrité ou à la sécurité du Service</li>
                  <li>Ne pas tenter d'accéder aux données d'autres utilisateurs</li>
                  <li>Ne pas diffuser de contenu illicite, offensant ou contraire aux bonnes mœurs</li>
                  <li>Respecter les droits de propriété intellectuelle de l'Éditeur</li>
                  <li>Ne pas utiliser le Service à des fins illégales ou frauduleuses</li>
                  <li>Ne pas revendre ou céder son accès au Service</li>
                  <li>Maintenir à jour ses informations de compte</li>
                  <li>Respecter la législation en vigueur (TVA, facturation, données personnelles)</li>
                  <li>Effectuer des sauvegardes régulières de ses données</li>
                </ul>

                <p className="mt-4">
                  Toute violation de ces obligations peut entraîner la suspension ou la résiliation
                  immédiate du compte sans préavis ni remboursement.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Obligations de l'Éditeur</h2>

              <div className="space-y-3">
                <p>L'Éditeur s'engage à :</p>

                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Fournir un Service accessible 24h/24, 7j/7 (hors maintenance)</li>
                  <li>Assurer la sécurité et la confidentialité des données</li>
                  <li>Maintenir la conformité avec l'Article 286 du CGI (anti-fraude TVA)</li>
                  <li>Effectuer des sauvegardes quotidiennes automatiques</li>
                  <li>Conserver les données comptables pendant 6 ans minimum</li>
                  <li>Fournir un support technique par email</li>
                  <li>Informer les Utilisateurs des évolutions du Service</li>
                  <li>Respecter la réglementation RGPD</li>
                </ul>

                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm">
                    <strong>Disponibilité du Service :</strong> L'Éditeur garantit un taux de disponibilité
                    de 99% sur l'année (hors maintenance programmée). Des interruptions peuvent survenir
                    pour maintenance technique, mises à jour de sécurité ou cas de force majeure.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Propriété Intellectuelle</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">8.1 Propriété du Service</h3>
                  <p>
                    Le Service, son code source, sa structure, son design, ses algorithmes et toute
                    documentation associée sont la propriété exclusive de l'Éditeur et sont protégés
                    par le droit d'auteur et les lois sur la propriété intellectuelle.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">8.2 Licence d'utilisation</h3>
                  <p>
                    L'Éditeur accorde à l'Utilisateur une licence non exclusive, non transférable et
                    révocable d'utilisation du Service pour la durée de l'abonnement. Cette licence
                    ne confère aucun droit de propriété sur le Service.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">8.3 Propriété des données</h3>
                  <p>
                    L'Utilisateur reste propriétaire de toutes les données qu'il saisit dans le Service.
                    L'Éditeur s'engage à ne pas utiliser ces données à d'autres fins que la fourniture
                    du Service, sauf consentement explicite de l'Utilisateur.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Protection des Données Personnelles</h2>

              <p className="mb-4">
                Le traitement des données personnelles est régi par notre
                <a href="/privacy-policy" className="text-sky-600 hover:text-sky-700 underline ml-1">Politique de Confidentialité</a>,
                conforme au RGPD.
              </p>

              <p className="mb-4">
                L'Éditeur s'engage à :
              </p>

              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Protéger les données par des mesures techniques et organisationnelles appropriées</li>
                <li>Ne pas vendre, louer ou partager les données à des tiers</li>
                <li>Héberger les données en Union Européenne</li>
                <li>Permettre l'exercice des droits RGPD (accès, rectification, suppression, portabilité)</li>
                <li>Notifier toute violation de données dans les 72 heures à la CNIL</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Durée et Résiliation</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">10.1 Durée</h3>
                  <p>
                    L'abonnement est souscrit pour une durée d'un mois ou d'un an selon la formule choisie,
                    renouvelable automatiquement par tacite reconduction sauf résiliation.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">10.2 Résiliation par l'Utilisateur</h3>
                  <p className="mb-2">
                    L'Utilisateur peut résilier son abonnement à tout moment depuis son compte,
                    avec un préavis de 30 jours. La résiliation prend effet à la fin de la période en cours.
                  </p>
                  <p className="text-sm text-gray-600">
                    Aucun remboursement ne sera effectué pour la période en cours, même en cas de résiliation
                    anticipée.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">10.3 Résiliation par l'Éditeur</h3>
                  <p className="mb-2">
                    L'Éditeur peut résilier l'abonnement avec un préavis de 30 jours ou immédiatement en cas de :
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Non-paiement après relance</li>
                    <li>Violation des présentes CGU</li>
                    <li>Utilisation frauduleuse ou illégale du Service</li>
                    <li>Atteinte à la sécurité du Service</li>
                    <li>Faillite ou liquidation judiciaire de l'Utilisateur</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">10.4 Conséquences de la résiliation</h3>
                  <p className="mb-2">
                    À la résiliation :
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>L'accès au Service est immédiatement interrompu</li>
                    <li>L'Utilisateur dispose de 30 jours pour exporter ses données</li>
                    <li>Passé ce délai, les données actives peuvent être supprimées</li>
                    <li>Les archives comptables sont conservées 6 ans (obligation légale)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Responsabilité et Garanties</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">11.1 Limitation de responsabilité</h3>
                  <p className="mb-2">
                    L'Éditeur ne saurait être tenu responsable :
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Des dommages indirects (perte de données, perte d'exploitation, manque à gagner)</li>
                    <li>Des interruptions temporaires du Service pour maintenance</li>
                    <li>De l'utilisation inappropriée du Service par l'Utilisateur</li>
                    <li>Des problèmes liés au matériel, connexion internet ou navigateur de l'Utilisateur</li>
                    <li>De la perte de données due à une négligence de l'Utilisateur</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">11.2 Plafonnement</h3>
                  <p>
                    En tout état de cause, la responsabilité de l'Éditeur est limitée au montant
                    des sommes versées par l'Utilisateur au cours des 12 derniers mois.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">11.3 Force majeure</h3>
                  <p>
                    L'Éditeur ne pourra être tenu responsable en cas de force majeure ou d'événement
                    échappant à son contrôle raisonnable (catastrophe naturelle, guerre, grève, panne
                    des infrastructures internet, cyberattaque, etc.).
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Modifications des CGU</h2>

              <p className="mb-4">
                L'Éditeur se réserve le droit de modifier les présentes CGU à tout moment.
                Les Utilisateurs seront informés par email et/ou notification dans l'application
                au moins 30 jours avant l'entrée en vigueur des modifications.
              </p>

              <p>
                La poursuite de l'utilisation du Service après l'entrée en vigueur des nouvelles CGU
                vaut acceptation de celles-ci. En cas de désaccord, l'Utilisateur peut résilier son abonnement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Droit Applicable et Litiges</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">13.1 Droit applicable</h3>
                  <p>
                    Les présentes CGU sont régies par le droit français.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">13.2 Règlement des litiges</h3>
                  <p className="mb-2">
                    En cas de litige, les parties s'efforceront de trouver une solution amiable.
                  </p>
                  <p>
                    À défaut d'accord amiable dans un délai de 60 jours, le litige sera porté devant
                    les tribunaux compétents de [Ville du siège social de l'Éditeur].
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">13.3 Médiation</h3>
                  <p>
                    Conformément à l'article L.612-1 du Code de la consommation, l'Utilisateur peut
                    recourir gratuitement à un médiateur de la consommation en vue de la résolution
                    amiable du litige.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Contact et Support</h2>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="mb-2">Pour toute question concernant les présentes CGU ou le Service :</p>
                <p><strong>Email :</strong> <a href="mailto:[support@votresociete.fr]" className="text-sky-600 hover:text-sky-700">[support@votresociete.fr]</a></p>
                <p><strong>Téléphone :</strong> [Numéro de téléphone]</p>
                <p><strong>Adresse :</strong> [Adresse postale complète]</p>
                <p><strong>Horaires du support :</strong> Lundi au vendredi, 9h-18h (hors jours fériés)</p>
              </div>
            </section>

            <div className="mt-8 pt-8 border-t border-gray-200 text-sm text-gray-500">
              <p><strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR')}</p>
              <p className="mt-2"><strong>Version :</strong> 1.0</p>
              <p className="mt-4">
                En utilisant le Service DentalCloud, vous reconnaissez avoir lu, compris et accepté
                l'intégralité des présentes Conditions Générales d'Utilisation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
