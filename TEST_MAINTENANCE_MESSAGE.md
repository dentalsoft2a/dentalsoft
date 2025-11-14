# Test du message de maintenance

## Vue d'ensemble

Le système de surveillance de connexion détecte automatiquement les pertes de connexion avec la base de données et affiche un message de maintenance professionnel.

## ⚠️ Correctif appliqué (Version finale)

Le composant a été refactoré pour utiliser des `useRef` au lieu de dépendances dans `useEffect`, éliminant ainsi les problèmes de re-render infinis et garantissant que le message reste affiché jusqu'à ce que la connexion soit vraiment rétablie.

**Problème résolu**: Le message ne disparaît plus après 1 seconde - il reste affiché jusqu'à ce que la connexion soit vraiment rétablie.

## Fonctionnalités

### Détection automatique
- ✅ Vérifie la connexion Supabase toutes les 10 secondes (mode normal)
- ✅ Vérifie toutes les 5 secondes en cas de perte de connexion (mode récupération)
- ✅ Timeout de 8 secondes pour détecter les connexions lentes
- ✅ Nécessite 2 échecs consécutifs avant d'afficher le message (évite les faux positifs)
- ✅ **Corrigé**: Le message reste affiché de manière stable sans disparaître prématurément

### Reconnexion automatique
- ✅ Le message disparaît automatiquement UNIQUEMENT quand la connexion est vraiment rétablie
- ✅ Écoute les événements réseau du navigateur (online/offline)
- ✅ Aucune action manuelle requise de l'utilisateur
- ✅ Logs console pour suivre l'état de la connexion

### Interface utilisateur
- ✅ Message en plein écran avec fond flou
- ✅ Design professionnel et rassurant
- ✅ Animations pour indiquer que le système vérifie activement
- ✅ Messages clairs sur ce qui se passe

## Comment tester

### Méthode 1: Arrêter temporairement Supabase (Recommandé pour les tests)

1. **Connectez-vous à l'application**
2. **Ouvrez la Console du navigateur** (F12)
3. **Simulez une perte de connexion** en exécutant:
   ```javascript
   // Désactiver temporairement les requêtes Supabase
   const originalFetch = window.fetch;
   window.fetch = function(...args) {
     if (args[0].includes('supabase.co')) {
       return Promise.reject(new Error('Simulated network error'));
     }
     return originalFetch.apply(this, args);
   };
   ```
4. **Attendez 20-30 secondes** - Le message de maintenance devrait apparaître
5. **Restaurez la connexion**:
   ```javascript
   window.fetch = originalFetch;
   ```
6. **Attendez quelques secondes** - Le message devrait disparaître automatiquement

### Méthode 2: Couper la connexion réseau

1. **Connectez-vous à l'application**
2. **Coupez votre connexion Internet**:
   - Sur Windows: Désactiver Wi-Fi/Ethernet
   - Sur Mac: Désactiver Wi-Fi
   - Ou utilisez les DevTools du navigateur:
     - F12 → Network → Offline
3. **Le message de maintenance devrait apparaître immédiatement**
4. **Rétablissez la connexion réseau**
5. **Le message devrait disparaître automatiquement**

### Méthode 3: Simuler avec DevTools (Chrome/Edge)

1. **Ouvrez DevTools** (F12)
2. **Allez dans l'onglet Network**
3. **Sélectionnez "Offline" dans le menu déroulant**
4. **Le message de maintenance apparaît**
5. **Sélectionnez "Online"**
6. **Le message disparaît automatiquement**

### Méthode 4: Bloquer le domaine Supabase (Test avancé)

Modifiez votre fichier hosts pour bloquer temporairement Supabase:

**Windows**: `C:\Windows\System32\drivers\etc\hosts`
**Mac/Linux**: `/etc/hosts`

Ajoutez:
```
127.0.0.1 eovmrvtiizyhyzcmpvov.supabase.co
```

Ensuite:
1. Rechargez l'application
2. Le message de maintenance devrait apparaître après 20-30 secondes
3. Supprimez la ligne du fichier hosts
4. Rechargez ou attendez la reconnexion automatique

## Logs console

Le système affiche des logs dans la console pour faciliter le débogage:

```
❌ Perte de connexion réseau détectée
Supabase connection error: Error: Connection timeout
```

Quand la connexion est rétablie:
```
🌐 Connexion réseau détectée
✅ Connexion rétablie avec succès
```

## Comportement attendu

### Quand la connexion est perdue:
1. Premier échec → Le système attend (évite les faux positifs)
2. Deuxième échec consécutif → Message de maintenance affiché
3. L'intervalle de vérification passe à 5 secondes (mode récupération)
4. Le système continue de vérifier automatiquement

### Quand la connexion est rétablie:
1. Une vérification réussit → Le message disparaît immédiatement
2. L'intervalle repasse à 10 secondes (mode normal)
3. Un log de succès est affiché dans la console

## Message affiché

Le message contient:
- **Titre**: "Mise à jour en cours"
- **Badge**: "Maintenance système"
- **Explication**: Mise à jour pour améliorer performances et sécurité
- **Information**: Interruption temporaire de quelques minutes
- **Indicateur**: Points animés montrant l'activité
- **Status**: "Vérification de la connexion..." avec indicateur visuel
- **Note**: Le message disparaîtra automatiquement

## Configuration

### Intervalle de vérification

Pour modifier les intervalles, éditez `src/components/common/ServerStatusMonitor.tsx`:

```typescript
const [retryInterval, setRetryInterval] = useState(10000); // Mode normal: 10s
setRetryInterval(5000); // Mode récupération: 5s
```

### Timeout de connexion

```typescript
const timeoutPromise = new Promise((_, reject) => {
  timeoutId = setTimeout(() => reject(new Error('Connection timeout')), 8000); // 8s
});
```

### Nombre d'échecs requis

```typescript
if (newCount >= 2) { // Nécessite 2 échecs consécutifs
  setIsOffline(true);
}
```

## Cas d'utilisation réels

### 1. Maintenance planifiée Supabase
- Supabase effectue des mises à jour régulières
- Le message informe les utilisateurs de patienter
- Reconnexion automatique après la maintenance

### 2. Problèmes réseau temporaires
- Wi-Fi instable, perte de 4G, etc.
- Le système attend 2 échecs (évite les faux positifs)
- Reconnexion automatique dès que le réseau revient

### 3. Surcharge serveur
- Si Supabase est surchargé et répond lentement
- Timeout de 8 secondes déclenche le message
- Le système continue d'essayer jusqu'à ce que ça marche

### 4. Déploiement de nouvelles versions
- Quand vous déployez une nouvelle version Docker
- Les utilisateurs connectés voient le message pendant le redémarrage
- Reconnexion automatique quand le serveur redémarre

## Désactivation (pour les tests uniquement)

Pour désactiver temporairement le monitoring:

Dans `src/App.tsx`, changez:
```typescript
const showServerMonitor = !!user; // Activé
```
en:
```typescript
const showServerMonitor = false; // Désactivé
```

**⚠️ Ne jamais désactiver en production!**

## Personnalisation du message

Pour modifier le message, éditez le JSX dans `ServerStatusMonitor.tsx`:

```tsx
<h2 className="text-3xl font-bold text-slate-900 mb-4">
  Mise à jour en cours
</h2>
```

Changez le texte selon vos besoins.

## Fréquence des vérifications

**Mode normal** (connexion stable):
- Vérification toutes les 10 secondes
- Peu d'impact sur les performances

**Mode récupération** (connexion perdue):
- Vérification toutes les 5 secondes
- Reconnexion plus rapide pour une meilleure UX

## Compatibilité

- ✅ Chrome, Edge, Firefox, Safari
- ✅ Desktop et Mobile
- ✅ Tous les systèmes d'exploitation
- ✅ Fonctionne en PWA

## Sécurité

- Le composant ne peut être monté que si l'utilisateur est connecté
- Aucune information sensible n'est affichée
- Les erreurs sont loggées uniquement en console (pas visibles par l'utilisateur)

## Performance

- **Impact minimal**: 1 requête légère toutes les 10 secondes
- **Optimisé**: La requête ne récupère qu'un seul ID
- **Timeout**: Évite les requêtes qui traînent indéfiniment
- **Smart retry**: Intervalle plus court uniquement quand nécessaire

## Dépannage

### Le message n'apparaît jamais
- Vérifiez que vous êtes bien connecté
- Vérifiez `showServerMonitor = !!user` dans App.tsx
- Regardez les logs console pour voir si les vérifications ont lieu

### Le message apparaît trop souvent
- Votre connexion est peut-être instable
- Augmentez le nombre d'échecs requis (actuellement 2)
- Augmentez le timeout (actuellement 8s)

### Le message ne disparaît pas
- La connexion n'est vraiment pas rétablie
- Vérifiez l'état de Supabase sur status.supabase.com
- Rechargez complètement la page

### False positives
- Le système nécessite 2 échecs consécutifs
- Si vous avez encore des faux positifs, augmentez à 3:
  ```typescript
  if (newCount >= 3) { setIsOffline(true); }
  ```

## Améliorations futures possibles

1. **Afficher un temps d'attente estimé**
2. **Bouton "Actualiser" manuel** pour forcer une reconnexion
3. **Historique des interruptions** pour les admins
4. **Notification par email** aux admins en cas d'interruption prolongée
5. **Différencier** maintenance planifiée vs problème technique

## Conclusion

Le système de surveillance est déjà en place et fonctionne automatiquement. Il offre une excellente expérience utilisateur en cas de perte de connexion avec la base de données, tout en se rétablissant automatiquement dès que possible.

Aucune configuration supplémentaire n'est requise - le système est prêt à l'emploi! 🚀
