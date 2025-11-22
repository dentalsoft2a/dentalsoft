# Assistant IA GB Dental - Documentation

## Vue d'ensemble

Un assistant IA conversationnel intelligent intégré à l'application GB Dental, permettant aux utilisateurs de gérer leur laboratoire dentaire en langage naturel via dialogue avec GPT-4.

---

## ✨ Fonctionnalités implémentées

### Phase 1 : Foundation (COMPLÈTE ✅)

**Infrastructure**
- ✅ Tables Supabase (conversations, messages, logs, stats, préférences)
- ✅ Edge Function proxy OpenAI sécurisé
- ✅ RLS policies strictes (isolation par utilisateur/laboratoire)
- ✅ Rate limiting (100 messages/jour)
- ✅ Métriques complètes (tokens, temps de réponse)

**Frontend**
- ✅ Composant chat flottant accessible partout
- ✅ UI moderne et responsive
- ✅ Input avec placeholder dynamique
- ✅ Affichage messages (user/assistant)
- ✅ Indicateur de chargement animé
- ✅ Quick actions pour démarrer
- ✅ Compteur d'utilisation quotidien
- ✅ Gestion erreurs utilisateur

**Backend**
- ✅ Service aiService.ts complet
- ✅ Hooks React Query optimisés
- ✅ Authentification Supabase
- ✅ Contexte utilisateur automatique
- ✅ Historique conversations persistant

---

## 🎯 Architecture

### Stack technique

**IA & LLM**
- OpenAI GPT-4-turbo-preview
- Modèle : `gpt-4-turbo-preview`
- Température : 0.7 (équilibre créativité/précision)
- Max tokens : 500 par réponse
- Context window : 128k tokens

**Backend**
- Edge Functions Supabase (Deno runtime)
- Proxy sécurisé vers API OpenAI
- PostgreSQL pour persistance
- RLS pour isolation données

**Frontend**
- React + TypeScript
- React Query pour cache
- Tailwind CSS pour styling
- Lucide React pour icônes

---

## 📊 Base de données

### Tables créées

#### `ai_conversations`
Stocke les conversations utilisateur
```sql
- id (UUID)
- user_id (UUID) → auth.users
- laboratory_id (UUID) → profiles
- title (TEXT) - Titre auto-généré
- message_count (INTEGER)
- total_tokens_used (INTEGER)
- is_archived (BOOLEAN)
- is_pinned (BOOLEAN)
- created_at, updated_at, last_message_at
```

#### `ai_messages`
Messages individuels des conversations
```sql
- id (UUID)
- conversation_id (UUID) → ai_conversations
- role (TEXT) - 'user' | 'assistant' | 'system'
- content (TEXT)
- tokens_used (INTEGER)
- model_used (TEXT)
- response_time_ms (INTEGER)
- function_call (JSONB) - Pour function calling futur
- function_response (JSONB)
- metadata (JSONB)
- created_at
```

#### `ai_function_logs`
Traçabilité actions IA
```sql
- id (UUID)
- message_id, conversation_id, user_id, laboratory_id
- function_name (TEXT)
- parameters (JSONB)
- result (JSONB)
- success (BOOLEAN)
- error_message (TEXT)
- execution_time_ms (INTEGER)
- created_at
```

#### `ai_usage_stats`
Statistiques quotidiennes
```sql
- id (UUID)
- user_id, laboratory_id
- date (DATE)
- total_messages (INTEGER)
- total_tokens (INTEGER)
- total_conversations (INTEGER)
- functions_called (JSONB)
- estimated_cost_cents (INTEGER)
- UNIQUE(user_id, date) - 1 entrée/jour
```

#### `ai_user_preferences`
Préférences utilisateur
```sql
- id (UUID)
- user_id (UUID) UNIQUE
- voice_enabled (BOOLEAN)
- voice_language (TEXT) - 'fr-FR'
- ai_personality (TEXT) - 'friendly'|'professional'|'concise'
- auto_execute_functions (BOOLEAN)
- show_function_details (BOOLEAN)
- favorite_actions (JSONB)
- notify_on_function_completion (BOOLEAN)
```

---

## 🔐 Sécurité

### RLS (Row Level Security)

**Principes :**
- Chaque utilisateur voit SEULEMENT ses conversations
- Isolation stricte par `user_id`
- Pas d'accès cross-laboratoire

**Policies appliquées :**
```sql
-- Conversations
✓ Users can view own conversations (SELECT)
✓ Users can create own conversations (INSERT)
✓ Users can update own conversations (UPDATE)
✓ Users can delete own conversations (DELETE)

-- Messages
✓ Users can view messages in own conversations
✓ Users can create messages in own conversations

-- Function logs
✓ Users can view own function logs
✓ Users can create own function logs

-- Usage stats
✓ Users can view/upsert own usage stats

-- Preferences
✓ Users can view/update own preferences
```

### Rate Limiting

**Limites quotidiennes :**
- 100 messages/jour/utilisateur
- Réinitialisation : Minuit UTC
- Vérification dans Edge Function
- Compteur en temps réel dans UI

**Réponse limite atteinte :**
```json
{
  "error": "Limite quotidienne atteinte (100 messages/jour)",
  "limit": 100,
  "used": 100
}
```

---

## 🚀 Edge Function : ai-chat

### Endpoint
```
POST /functions/v1/ai-chat
```

### Headers requis
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

### Request body
```typescript
{
  conversationId?: string; // Optionnel, créé auto si absent
  message: string;          // Message utilisateur
  context?: {
    currentPage?: string;   // Page actuelle (dashboard, delivery-notes, etc.)
    selectedData?: any;     // Données contextuelles
  }
}
```

### Response success
```typescript
{
  conversationId: string;  // ID conversation (nouveau ou existant)
  message: string;         // Réponse de l'IA
  tokensUsed: number;      // Tokens consommés
  messageCount: number;    // Messages envoyés aujourd'hui
  dailyLimit: number;      // Limite quotidienne (100)
}
```

### Erreurs possibles

**401 Unauthorized**
```json
{ "error": "Non autorisé" }
```

**404 Not Found**
```json
{ "error": "Profil utilisateur non trouvé" }
```

**429 Too Many Requests**
```json
{
  "error": "Limite quotidienne atteinte (100 messages/jour)",
  "limit": 100,
  "used": 100
}
```

**500 Internal Server Error**
```json
{ "error": "Configuration OpenAI manquante" }
{ "error": "Erreur lors de l'appel à OpenAI" }
```

---

## 💻 Utilisation Frontend

### Intégration dans l'app

Le composant est automatiquement ajouté dans `DashboardLayout` :

```tsx
import AIAssistantChat from '../ai-assistant/AIAssistantChat';

// Dans le render
<AIAssistantChat currentPage={currentPage} />
```

### Hook principal : useAIChat

```typescript
import { useAIChat } from '../../hooks/useAIChat';

function MyComponent() {
  const {
    conversations,        // Liste conversations
    messages,             // Messages conversation actuelle
    sendMessage,          // Fonction envoyer message
    startNewConversation, // Créer nouvelle conversation
    usageStats,           // Stats utilisation
    isLoading,            // État chargement
    error,                // Erreur éventuelle
  } = useAIChat();

  // Envoyer un message
  await sendMessage('Bonjour !', { currentPage: 'dashboard' });

  // Nouvelle conversation
  await startNewConversation();
}
```

### Composant AIAssistantChat

**Props :**
```typescript
interface AIAssistantChatProps {
  currentPage?: string;   // Page actuelle pour contexte
  selectedData?: any;     // Données sélectionnées
}
```

**États :**
- Fermé : Bouton flottant avec badge vert
- Ouvert : Chat 400x600px en bas à droite
- Maximisé : Plein écran

**Actions disponibles :**
- Envoyer message
- Agrandir/Réduire
- Fermer
- Quick actions (boutons suggestions)

---

## 🤖 Personnalité de l'IA

### System Prompt

```
Tu es l'assistant IA de GB Dental, spécialisé dans la gestion
de laboratoires prothésistes dentaires.

CONTEXTE UTILISATEUR :
- Laboratoire : {laboratoryName}
- Utilisateur : {userName} ({userRole})
- Page actuelle : {currentPage}

PERSONNALITÉ :
- Amical et professionnel
- Utilise des emojis avec parcimonie
- Réponds en français
- Sois concis mais complet
- Confirme les actions importantes

CAPACITÉS ACTUELLES :
- Consulter les statistiques du laboratoire
- Chercher des informations
- Expliquer comment utiliser l'application
- Guider dans la navigation

NOTE : Les fonctions avancées (création BL, modification données)
seront disponibles prochainement.

RÈGLES :
- Reste dans ton rôle d'assistant GB Dental
- Ne donne pas d'informations médicales
- Redirige vers les fonctionnalités existantes
- Sois encourageant et utile
```

### Exemples de conversations

**User:** "Bonjour !"
**IA:** "Bonjour ! 👋 Je suis votre assistant IA GB Dental. Comment puis-je vous aider aujourd'hui ?"

**User:** "Comment créer un bon de livraison ?"
**IA:** "Pour créer un bon de livraison, rendez-vous dans la section 'Bons de livraison' via le menu. Ensuite :
1. Cliquez sur 'Nouveau bon'
2. Sélectionnez le dentiste
3. Ajoutez les articles
4. Validez le bon

Voulez-vous que je vous guide dans une fonctionnalité spécifique ? 😊"

**User:** "Combien j'ai fait ce mois-ci ?"
**IA:** "Pour consulter vos statistiques du mois, je vous invite à aller sur le Dashboard. Vous y trouverez :
- Votre chiffre d'affaires
- Le nombre de bons de livraison
- Vos dentistes les plus actifs

Souhaitez-vous plus de détails sur une statistique en particulier ? 📊"

---

## 📈 Métriques et Monitoring

### Données collectées

**Par message :**
- Tokens utilisés (input + output)
- Temps de réponse (ms)
- Modèle utilisé
- Succès/échec

**Par jour :**
- Total messages envoyés
- Total tokens consommés
- Nombre conversations créées
- Fonctions appelées (futur)
- Coût estimé

### Affichage utilisateur

**Badge conversation :**
- "X/100 messages aujourd'hui"
- Compteur en temps réel
- Alerte à 90% (90 messages)

**Détails message :**
- Tokens utilisés
- Temps de réponse (affiché sous messages assistant)

---

## 💰 Coûts OpenAI

### Pricing GPT-4-turbo

- Input : $0.01 / 1K tokens
- Output : $0.03 / 1K tokens

### Estimation

**Message moyen : 2000 tokens**
- Input : 1500 tokens ($0.015)
- Output : 500 tokens ($0.015)
- **Total : $0.03/message**

**Utilisateur actif : 30 messages/jour**
- Coût quotidien : $0.90
- **Coût mensuel : ~$27/utilisateur**

**10 utilisateurs actifs**
- **Budget mensuel : ~$270**

### Optimisations possibles

1. Passer à GPT-3.5-turbo pour requêtes simples
   - Coût : $0.001/1K tokens (30x moins cher)
   - Usage : Questions simples, recherches

2. Limiter historique contexte
   - Actuellement : 10 derniers messages
   - Réduction tokens input

3. Résumés automatiques
   - Conversations longues → résumé
   - Économie tokens contexte

---

## 🔮 Roadmap Future

### Phase 2 : Function Calling (Prioritaire)

**10 fonctions essentielles :**
1. `create_delivery_note` - Créer bon livraison
2. `list_delivery_notes` - Lister bons avec filtres
3. `add_catalog_item` - Ajouter article catalogue
4. `search_catalog` - Rechercher articles
5. `add_dentist` - Ajouter nouveau dentiste
6. `list_dentists` - Lister dentistes
7. `get_dashboard_stats` - Stats complètes
8. `search_global` - Recherche universelle
9. `list_received_photos` - Photos reçues
10. `get_recent_activity` - Activité récente

**Implémentation :**
- Ajouter `functions` dans appel OpenAI
- Créer fichier `functions/` dans Edge Function
- Parser `function_call` dans réponse
- Exécuter fonction côté serveur
- Retourner résultat à l'IA
- Continuer conversation

### Phase 3 : Features Avancées

**Voice Input**
- Web Speech API
- Transcription temps réel
- Bouton microphone

**Streaming Responses**
- SSE (Server-Sent Events)
- Affichage mot par mot
- Meilleure UX

**Multi-conversations**
- Liste conversations sidebar
- Recherche dans historique
- Export PDF

**Analytics Dashboard**
- Top fonctions utilisées
- Temps moyen réponse
- Satisfaction utilisateurs

---

## 🛠️ Configuration requise

### Variables d'environnement

**Supabase (Edge Function)**
```bash
OPENAI_API_KEY=sk-proj-...  # Clé API OpenAI
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJh...
```

**Frontend (.env)**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
```

### Déploiement

**Edge Function :**
```bash
# Déjà déployée automatiquement
# Accessible via :
https://xxx.supabase.co/functions/v1/ai-chat
```

**Frontend :**
```bash
npm run build
# Déployer dist/ sur votre hébergement
```

---

## 🧪 Tests

### Test manuel

1. **Ouvrir l'app** → Voir bouton robot flottant
2. **Cliquer** → Chat s'ouvre
3. **Envoyer "Bonjour"** → Réponse IA
4. **Vérifier compteur** → "1/100 messages aujourd'hui"
5. **Tester quick actions** → Click bouton suggestion
6. **Agrandir** → Plein écran
7. **Fermer** → Bouton robot réapparaît

### Test API

```bash
# Obtenir token Supabase
# Puis :

curl -X POST https://xxx.supabase.co/functions/v1/ai-chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Bonjour !",
    "context": {
      "currentPage": "dashboard"
    }
  }'
```

### Test Rate Limiting

```bash
# Envoyer 101 messages rapidement
# Le 101ème doit retourner 429
```

---

## 📝 Fichiers créés

### Backend (Supabase)
```
supabase/
  migrations/
    create_ai_assistant_system.sql      # Tables + RLS
  functions/
    ai-chat/
      index.ts                           # Edge Function principale
```

### Frontend
```
src/
  types/
    ai.types.ts                          # Types TypeScript
  services/
    aiService.ts                         # API calls
  hooks/
    useAIChat.ts                         # Hook React Query
  components/
    ai-assistant/
      AIAssistantChat.tsx                # Composant principal
      MessageBubble.tsx                  # Affichage messages
```

---

## 🎉 Conclusion

### État actuel : MVP Fonctionnel ✅

**Implémenté :**
- ✅ Infrastructure complète (BDD, API, Frontend)
- ✅ Chat conversationnel fonctionnel
- ✅ Sécurité et rate limiting
- ✅ UI moderne et responsive
- ✅ Métriques et monitoring

**Prêt pour :**
- Phase de test utilisateurs
- Collecte feedback
- Ajout function calling (Phase 2)

**Budget mensuel estimé :**
- 10 utilisateurs actifs : ~$270/mois
- 50 utilisateurs actifs : ~$1,350/mois

**L'assistant IA est maintenant live et peut aider les utilisateurs à naviguer dans l'application en langage naturel ! 🚀**

Pour activer les fonctions avancées (créer BL, modifier données), passer à la Phase 2 : Function Calling.
