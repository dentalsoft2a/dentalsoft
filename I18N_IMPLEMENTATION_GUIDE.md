# Guide d'Implémentation de l'Internationalisation (i18n)

## ✅ Déjà Implémenté

### 1. Configuration de base
- ✅ Installation de `react-i18next`, `i18next`, `i18next-browser-languagedetector`
- ✅ Configuration i18n dans `/src/i18n/config.ts`
- ✅ Import dans `main.tsx` pour initialiser i18n au démarrage
- ✅ Détection automatique de la langue (localStorage → navigateur → français par défaut)

### 2. Fichiers de traduction
Tous les fichiers de traduction JSON sont créés dans `/src/locales/` :

#### Français (/src/locales/fr/)
- ✅ `common.json` - Navigation, boutons, messages, statuts
- ✅ `pages.json` - Landing page, dashboard, settings
- ✅ `forms.json` - Labels, placeholders, validations
- ✅ `pdf.json` - Templates pour factures, proformas, bons de livraison
- ✅ `emails.json` - Templates d'emails

#### Anglais (/src/locales/en/)
- ✅ Tous les fichiers traduits avec la structure identique

### 3. Hooks et Services
- ✅ `/src/hooks/useLanguage.ts` - Hook personnalisé pour gérer le changement de langue
  - Synchronisation automatique avec Supabase
  - Gestion du localStorage
  - Fonctions utilitaires (getLanguageName, getLanguageFlag)

- ✅ `/src/utils/languageService.ts` - Service de gestion de langue
  - Format de dates selon la locale
  - Format de nombres et devises
  - Gestion du temps relatif ("il y a 2 heures")
  - Noms des mois et jours selon la langue

### 4. Composants
- ✅ `/src/components/common/LanguageSwitcher.tsx`
  - Deux variantes : default et compact
  - Menu déroulant élégant avec drapeaux
  - Indicateur de langue active
  - Sauvegarde automatique de la préférence

### 5. Intégration dans l'application
- ✅ `App.tsx` - Message de chargement traduit
- ✅ `DashboardLayout.tsx` - Navigation entièrement traduite + LanguageSwitcher intégré

### 6. Base de données
- ✅ Migration Supabase créée : `20251117170000_add_language_preference.sql`
  - Ajout du champ `language_preference` dans `user_profiles`
  - Ajout du champ `language_preference` dans `dentist_accounts`
  - Contrainte CHECK pour limiter à 'fr' et 'en'
  - Index pour optimiser les performances
  - Valeur par défaut : 'fr'

## 📝 À Compléter

### 1. Application de la migration Supabase
```bash
# Dans votre projet Supabase
supabase db push

# Ou via le client MCP si disponible
mcp__supabase__apply_migration
```

### 2. Traduction des composants principaux

#### Landing Page (`/src/components/landing/LandingPage.tsx`)
Ajouter en haut du composant :
```typescript
import { useTranslation } from 'react-i18next';

export function LandingPage() {
  const { t } = useTranslation(['common', 'pages']);
  // ...
}
```

Exemples de traductions à appliquer :
```typescript
// Avant
<h1>Gérez votre laboratoire dentaire en toute simplicité</h1>

// Après
<h1>{t('pages:landing.hero.title')}</h1>
```

#### Pages d'authentification
- `LoginPage.tsx` - Utiliser `t('auth.login')`, `t('auth.email')`, etc.
- `RegisterPage.tsx` - Même principe
- `DentistLoginPage.tsx` et `DentistRegisterPage.tsx`

#### Pages principales
Pour chaque page, ajouter :
```typescript
const { t } = useTranslation(['common', 'pages']);
```

Puis remplacer les chaînes en dur par :
```typescript
// Messages de chargement
{t('common:messages.loading')}

// Boutons
<button>{t('common:buttons.save')}</button>
<button>{t('common:buttons.cancel')}</button>

// Navigation
{t('common:nav.dashboard')}
{t('common:nav.invoices')}
```

### 3. Adaptation des générateurs PDF

#### Fichier : `/src/utils/pdfGenerator.ts`
Ajouter l'import :
```typescript
import i18n from '../i18n/config';
```

Modifier les fonctions pour utiliser la langue actuelle :
```typescript
const lang = i18n.language;

// Utiliser les traductions
const invoiceTitle = i18n.t('pdf:invoice.title');
const dateLabel = i18n.t('pdf:invoice.date');
```

Pour les dates dans les PDF :
```typescript
import { languageService } from './languageService';

const formattedDate = languageService.formatDate(date, 'long');
```

#### Fichiers à adapter :
- `/src/utils/pdfGenerator.ts`
- `/src/utils/subscriptionInvoicePdfGenerator.ts`
- `/src/utils/documentationPdfGenerator.ts`

### 4. Adaptation du système d'emails

#### Edge Function : `/supabase/functions/send-email/index.ts`
Ajouter la détection de langue :
```typescript
// Récupérer la langue de l'utilisateur depuis la DB
const { data: userProfile } = await supabase
  .from('user_profiles')
  .select('language_preference')
  .eq('id', userId)
  .maybeSingle();

const userLang = userProfile?.language_preference || 'fr';

// Charger les traductions depuis les fichiers JSON
import frEmails from '../../src/locales/fr/emails.json';
import enEmails from '../../src/locales/en/emails.json';

const translations = userLang === 'fr' ? frEmails : enEmails;

// Utiliser les traductions
const emailSubject = translations.welcome.subject;
const emailBody = translations.welcome.body.replace('{{name}}', userName);
```

#### Fichiers à adapter :
- `/supabase/functions/send-email/index.ts`
- `/supabase/functions/send-invoice-email/index.ts`
- `/supabase/functions/send-proforma-email/index.ts`
- `/supabase/functions/invoice-notification/index.ts`

### 5. Traduction des pages légales

#### Pages à traduire :
- `LegalNotice.tsx` - Créer `legal.json` avec les mentions légales en FR/EN
- `PrivacyPolicy.tsx` - Politique de confidentialité complète
- `TermsOfService.tsx` - CGU/CGV

Structure recommandée (`/src/locales/*/legal.json`) :
```json
{
  "legalNotice": {
    "title": "Mentions légales",
    "companyInfo": "Informations sur l'entreprise",
    // ... contenu complet
  },
  "privacyPolicy": {
    "title": "Politique de confidentialité",
    // ... sections complètes
  },
  "terms": {
    "title": "Conditions générales",
    // ... toutes les conditions
  }
}
```

### 6. Ajouter le sélecteur de langue dans SettingsPage

#### Fichier : `/src/components/settings/SettingsPage.tsx`
Ajouter une section "Préférences" :
```typescript
import { LanguageSwitcher } from '../common/LanguageSwitcher';

// Dans le JSX, ajouter :
<div className="bg-white rounded-lg shadow p-6">
  <h2 className="text-xl font-semibold mb-4">{t('settings.preferences')}</h2>

  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {t('settings.language')}
      </label>
      <p className="text-sm text-slate-500 mb-3">
        {t('settings.languageDescription')}
      </p>
      <LanguageSwitcher variant="default" />
    </div>
  </div>
</div>
```

### 7. Mise à jour du AuthContext

#### Fichier : `/src/contexts/AuthContext.tsx`
Ajouter `language_preference` dans l'interface :
```typescript
type UserProfile = Database['public']['Tables']['user_profiles']['Row'] & {
  language_preference?: 'fr' | 'en';
};
```

Charger la préférence lors de la connexion et la synchroniser avec i18n.

## 🔍 Tests à Effectuer

### 1. Tests de changement de langue
- [ ] Vérifier que le changement de langue fonctionne instantanément
- [ ] Vérifier la persistance après rechargement
- [ ] Tester en mode déconnecté (utilise localStorage)
- [ ] Tester en mode connecté (synchronise avec Supabase)

### 2. Tests de détection automatique
- [ ] Navigateur en français → interface en français
- [ ] Navigateur en anglais → interface en anglais
- [ ] Navigateur dans une autre langue → interface en français (fallback)

### 3. Tests des formats
- [ ] Dates formatées correctement selon la langue
- [ ] Nombres et devises avec les bons séparateurs
- [ ] Mois et jours de la semaine traduits dans le calendrier

### 4. Tests des PDF
- [ ] Générer une facture en français
- [ ] Générer une facture en anglais
- [ ] Vérifier que tous les labels sont traduits
- [ ] Vérifier le format des dates

### 5. Tests des emails
- [ ] Email de bienvenue en français
- [ ] Email de bienvenue en anglais
- [ ] Notifications avec langue correcte selon l'utilisateur

## 📊 Structure des Fichiers de Traduction

### Organisation recommandée
```
src/locales/
├── fr/
│   ├── common.json       # Navigation, boutons, messages communs
│   ├── pages.json        # Contenu des pages (landing, dashboard, etc.)
│   ├── forms.json        # Formulaires et validations
│   ├── pdf.json          # Templates PDF
│   ├── emails.json       # Templates emails
│   └── legal.json        # Pages légales (à créer)
└── en/
    ├── common.json
    ├── pages.json
    ├── forms.json
    ├── pdf.json
    ├── emails.json
    └── legal.json
```

### Utilisation des namespaces
```typescript
// Importer un namespace spécifique
const { t } = useTranslation('common');
t('messages.loading'); // "Chargement..." ou "Loading..."

// Importer plusieurs namespaces
const { t } = useTranslation(['common', 'pages']);
t('common:nav.dashboard');
t('pages:landing.hero.title');

// Avec interpolation de variables
t('emails:welcome.greeting', { name: 'John' });
// Résultat : "Bonjour John," ou "Hello John,"
```

## 🚀 Déploiement

### 1. Avant de déployer
- [ ] Vérifier que toutes les chaînes sont externalisées
- [ ] Tester tous les flux utilisateur dans les deux langues
- [ ] Vérifier les PDF générés
- [ ] Tester l'envoi d'emails

### 2. Migration Supabase
```bash
# Appliquer la migration en production
supabase db push --project-ref YOUR_PROJECT_REF

# Ou via l'interface Supabase Dashboard :
# SQL Editor → Coller le contenu de la migration → Exécuter
```

### 3. Build de production
```bash
npm run build
```

### 4. Vérifications post-déploiement
- [ ] Le sélecteur de langue est visible
- [ ] Le changement de langue persiste
- [ ] Les préférences sont sauvegardées en base
- [ ] Les nouveaux utilisateurs voient la bonne langue par défaut

## 💡 Bonnes Pratiques

### 1. Ajout de nouvelles traductions
Toujours ajouter dans les deux langues simultanément :
```json
// fr/common.json
{
  "buttons": {
    "newButton": "Nouveau bouton"
  }
}

// en/common.json
{
  "buttons": {
    "newButton": "New button"
  }
}
```

### 2. Variables dynamiques
Utiliser l'interpolation :
```typescript
t('messages.welcome', { name: user.firstName })
// Résultat : "Bienvenue, John" ou "Welcome, John"
```

### 3. Pluralisation
```json
{
  "items": "{{count}} élément",
  "items_plural": "{{count}} éléments"
}
```

```typescript
t('items', { count: 1 }); // "1 élément"
t('items', { count: 5 }); // "5 éléments"
```

### 4. Clés de traduction manquantes
i18next affichera la clé si la traduction est manquante :
```typescript
t('non.existing.key'); // Affiche "non.existing.key"
```

En développement, activez les warnings :
```typescript
// Dans i18n/config.ts
debug: process.env.NODE_ENV === 'development',
```

## 📞 Support

### Problèmes courants

**Problème** : Les traductions ne s'affichent pas
**Solution** : Vérifier que `./i18n/config` est importé dans `main.tsx` avant `<App />`

**Problème** : La langue ne persiste pas après rechargement
**Solution** : Vérifier que le localStorage est accessible et que la migration Supabase est appliquée

**Problème** : Le sélecteur de langue ne fonctionne pas
**Solution** : Vérifier que le composant `LanguageSwitcher` est bien importé et que le hook `useLanguage` est utilisé correctement

**Problème** : Erreur TypeScript sur database.types.ts
**Solution** : Régénérer les types depuis Supabase ou ajouter manuellement le champ `language_preference`

---

## ✨ Résumé

L'infrastructure i18n est maintenant en place ! Voici ce qui fonctionne :

1. ✅ Système de traduction configuré et opérationnel
2. ✅ Détection automatique de la langue du navigateur
3. ✅ Sélecteur de langue avec drapeaux et menu élégant
4. ✅ Sauvegarde des préférences dans Supabase
5. ✅ Navigation traduite dans DashboardLayout
6. ✅ Services de formatage de dates/nombres/devises
7. ✅ Fichiers de traduction structurés pour FR et EN

**Prochaines étapes** : Appliquer les traductions aux composants restants en suivant les exemples fournis ci-dessus. Le système est modulaire et l'ajout de nouvelles traductions est simple et rapide !
