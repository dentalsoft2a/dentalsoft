# Internationalisation DentalCloud - Démarrage Rapide 🌍

## ✅ Ce qui est déjà en place

### Infrastructure complète installée
- ✅ react-i18next configuré et prêt à l'emploi
- ✅ Fichiers de traduction FR/EN créés
- ✅ Hook personnalisé `useLanguage` pour gérer les langues
- ✅ Composant `LanguageSwitcher` avec UI élégante
- ✅ Migration Supabase pour sauvegarder les préférences
- ✅ Service de formatage de dates/nombres selon la locale
- ✅ DashboardLayout et App.tsx déjà traduits

## 🚀 Comment utiliser les traductions dans vos composants

### 1. Import de base
```typescript
import { useTranslation } from 'react-i18next';

function MonComposant() {
  const { t } = useTranslation('common');
  // 'common' est le namespace par défaut (navigation, boutons, messages)

  return (
    <button>{t('buttons.save')}</button>
  );
}
```

### 2. Utiliser plusieurs namespaces
```typescript
const { t } = useTranslation(['common', 'pages']);

return (
  <>
    <h1>{t('pages:landing.hero.title')}</h1>
    <button>{t('common:buttons.save')}</button>
  </>
);
```

### 3. Variables dynamiques
```typescript
// Dans le fichier de traduction :
// "welcome": "Bienvenue, {{name}} !"

t('welcome', { name: user.firstName })
// Résultat : "Bienvenue, John !" ou "Welcome, John!"
```

## 📂 Namespaces disponibles

| Namespace | Contenu | Fichier |
|-----------|---------|---------|
| `common` | Navigation, boutons, messages, statuts | `locales/*/common.json` |
| `pages` | Landing page, dashboard, settings | `locales/*/pages.json` |
| `forms` | Labels, validations, placeholders | `locales/*/forms.json` |
| `pdf` | Templates pour documents PDF | `locales/*/pdf.json` |
| `emails` | Templates d'emails | `locales/*/emails.json` |

## 🎯 Exemples Pratiques

### Boutons et actions
```typescript
<button>{t('common:buttons.save')}</button>
<button>{t('common:buttons.cancel')}</button>
<button>{t('common:buttons.delete')}</button>
<button>{t('common:buttons.add')}</button>
```

### Messages et notifications
```typescript
// Chargement
<span>{t('common:messages.loading')}</span>

// Succès
toast.success(t('common:messages.operationSuccess'));

// Erreur
toast.error(t('common:messages.operationFailed'));

// Confirmation
confirm(t('common:messages.confirmDelete'));
```

### Navigation
```typescript
<Link to="/dashboard">{t('common:nav.dashboard')}</Link>
<Link to="/invoices">{t('common:nav.invoices')}</Link>
<Link to="/settings">{t('common:nav.settings')}</Link>
```

### Formulaires
```typescript
<label>{t('forms:labels.email')}</label>
<input placeholder={t('forms:placeholders.enterText')} />

// Validation
{errors.email && <span>{t('forms:validation.email')}</span>}
```

## 🛠️ Ajouter une nouvelle traduction

### 1. Ajouter dans le fichier FR
```json
// src/locales/fr/common.json
{
  "mySection": {
    "myKey": "Mon texte en français"
  }
}
```

### 2. Ajouter dans le fichier EN
```json
// src/locales/en/common.json
{
  "mySection": {
    "myKey": "My text in English"
  }
}
```

### 3. Utiliser dans le code
```typescript
{t('common:mySection.myKey')}
```

## 🎨 Ajouter le sélecteur de langue

### Dans un composant
```typescript
import { LanguageSwitcher } from '../common/LanguageSwitcher';

// Variante complète (avec label)
<LanguageSwitcher variant="default" />

// Variante compacte (icône + drapeau uniquement)
<LanguageSwitcher variant="compact" showLabel={false} />
```

## 📅 Formater des dates selon la langue

```typescript
import { languageService } from '../utils/languageService';

// Format court : 17/11/2025 ou 11/17/2025
const shortDate = languageService.formatDate(new Date(), 'short');

// Format long : 17 novembre 2025 ou November 17, 2025
const longDate = languageService.formatDate(new Date(), 'long');

// Format complet : lundi 17 novembre 2025 ou Monday, November 17, 2025
const fullDate = languageService.formatDate(new Date(), 'full');
```

## 💰 Formater des montants

```typescript
import { languageService } from '../utils/languageService';

// Devise
const price = languageService.formatCurrency(59.99);
// FR: "59,99 €" | EN: "€59.99"

// Nombre simple
const number = languageService.formatNumber(1234.56, 2);
// FR: "1 234,56" | EN: "1,234.56"
```

## ⏰ Temps relatif

```typescript
import { languageService } from '../utils/languageService';

const relativeTime = languageService.getRelativeTime(someDate);
// FR: "Il y a 2 heures" | EN: "2 hours ago"
```

## 🔄 Changer la langue programmatiquement

```typescript
import { useLanguage } from '../hooks/useLanguage';

function MonComposant() {
  const { changeLanguage, currentLanguage } = useLanguage();

  const handleLanguageChange = async () => {
    await changeLanguage('en'); // ou 'fr'
  };

  return (
    <div>
      Langue actuelle : {currentLanguage}
      <button onClick={handleLanguageChange}>Switch to English</button>
    </div>
  );
}
```

## 🗂️ Organisation des fichiers

```
src/
├── i18n/
│   └── config.ts              # Configuration i18next
├── locales/
│   ├── fr/
│   │   ├── common.json        # ✅ Créé
│   │   ├── pages.json         # ✅ Créé
│   │   ├── forms.json         # ✅ Créé
│   │   ├── pdf.json           # ✅ Créé
│   │   └── emails.json        # ✅ Créé
│   └── en/
│       ├── common.json        # ✅ Créé
│       ├── pages.json         # ✅ Créé
│       ├── forms.json         # ✅ Créé
│       ├── pdf.json           # ✅ Créé
│       └── emails.json        # ✅ Créé
├── hooks/
│   └── useLanguage.ts         # ✅ Hook personnalisé
├── utils/
│   └── languageService.ts     # ✅ Service de formatage
└── components/
    └── common/
        └── LanguageSwitcher.tsx  # ✅ Composant de sélection
```

## 🎓 Pattern recommandé pour un nouveau composant

```typescript
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

export function MyNewComponent() {
  // 1. Importer le hook avec les namespaces nécessaires
  const { t } = useTranslation(['common', 'pages']);

  return (
    <div>
      {/* 2. Utiliser les traductions avec le format namespace:key */}
      <h1>{t('pages:myPage.title')}</h1>
      <p>{t('pages:myPage.description')}</p>

      {/* 3. Boutons et actions depuis common */}
      <button>{t('common:buttons.save')}</button>
      <button>{t('common:buttons.cancel')}</button>

      {/* 4. Messages système */}
      {loading && <span>{t('common:messages.loading')}</span>}

      {/* 5. Sélecteur de langue (optionnel) */}
      <LanguageSwitcher variant="compact" />
    </div>
  );
}
```

## 📋 Checklist pour traduire un composant

- [ ] Importer `useTranslation` de react-i18next
- [ ] Identifier tous les textes en dur
- [ ] Créer les clés de traduction dans les fichiers JSON (FR et EN)
- [ ] Remplacer les textes en dur par `t('namespace:key')`
- [ ] Tester dans les deux langues
- [ ] Vérifier les formats de dates/nombres si nécessaire

## 🎯 Prochaines étapes

1. **Appliquer la migration Supabase**
   ```bash
   # Via Supabase CLI ou le dashboard
   ```

2. **Traduire la Landing Page**
   - Ouvrir `/src/components/landing/LandingPage.tsx`
   - Suivre le pattern ci-dessus
   - Les traductions sont déjà dans `pages:landing.*`

3. **Traduire les pages d'authentification**
   - LoginPage, RegisterPage
   - Utiliser `common:auth.*`

4. **Traduire progressivement les autres composants**
   - Suivre la checklist ci-dessus pour chaque composant

## 💡 Astuces

- **Préfixe de namespace optionnel** : Si vous n'utilisez qu'un namespace, pas besoin de préfixe
  ```typescript
  const { t } = useTranslation('common');
  t('buttons.save'); // ✅ Pas besoin de 'common:buttons.save'
  ```

- **Valeur par défaut** : Si une clé n'existe pas, elle s'affiche telle quelle
  ```typescript
  t('non.existing.key'); // Affiche : "non.existing.key"
  ```

- **Interpolation multiple** :
  ```typescript
  t('message', { name: 'John', age: 30 });
  // "Bonjour John, vous avez 30 ans"
  ```

---

**Documentation complète** : Consultez `I18N_IMPLEMENTATION_GUIDE.md` pour plus de détails !

**Questions ?** Le système est modulaire et extensible. Ajoutez simplement vos traductions dans les fichiers JSON et utilisez `t()` dans vos composants ! 🚀
