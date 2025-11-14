# 🚨 FIX URGENT: Client ID vide dans l'URL DS-Core

## Problème

Vous voyez cette URL:
```
https://r2.dscore.com/secureLogin?client_id=&code_challenge=...&redirect_uri=https://dentalcloud.fr
```

**Le client_id est vide** = l'image Docker ne contient pas les bonnes variables d'environnement.

## Cause

L'image Docker actuellement déployée sur votre serveur a été construite **AVANT** les modifications du fichier `.env` ou **SANS** passer les variables d'environnement au build.

## Solution immédiate

### Sur votre serveur de production (dentalcloud.fr)

```bash
# 1. Se connecter au serveur
ssh user@dentalcloud.fr

# 2. Aller dans le répertoire du projet
cd /chemin/vers/gb-dental

# 3. Vérifier que .env contient les bonnes valeurs
cat .env | grep DSCORE

# 4. Reconstruire l'image Docker avec le script
./deploy-production.sh

# OU manuellement:

# 4a. Arrêter le conteneur actuel
docker stop gb-dental
docker rm gb-dental

# 4b. Supprimer l'ancienne image
docker rmi gb-dental:latest

# 4c. Reconstruire avec les bonnes variables
./docker-build.sh

# 4d. Relancer le conteneur
docker run -d -p 3000:3000 --name gb-dental --restart unless-stopped gb-dental:latest
```

## Vérification

### 1. Vérifier que le conteneur tourne

```bash
docker ps | grep gb-dental
```

Vous devriez voir:
```
CONTAINER ID   IMAGE               STATUS        PORTS                    NAMES
xxxxx          gb-dental:latest    Up 2 minutes  0.0.0.0:3000->3000/tcp   gb-dental
```

### 2. Vérifier les logs

```bash
docker logs gb-dental | tail -20
```

### 3. Tester dans le navigateur

1. Allez sur https://dentalcloud.fr
2. Ouvrez la Console (F12)
3. Rechargez la page
4. Cherchez le log "DS-Core Configuration"
5. Vérifiez que `clientId` n'est PAS "NOT SET"

### 4. Tester la connexion DS-Core

1. Allez dans **Paramètres** > **Intégrations**
2. Cliquez sur **"Connecter à DS-Core"**
3. L'URL devrait maintenant être:
   ```
   https://r2.dscore.com/secureLogin?client_id=8e956fa7-c675-42fc-afe0-01fc58ddeb0b&code_challenge=...&redirect_uri=https://dentalcloud.fr/settings
   ```

## Pourquoi ça arrive?

### Variables Vite = Build Time

**IMPORTANT**: Les variables `VITE_*` sont intégrées au moment du BUILD, pas au runtime!

```
┌─────────────────────────────────────────────────────────┐
│  Variables .env  →  Docker Build  →  Fichiers JS        │
│                                                          │
│  Si vous changez .env, vous DEVEZ rebuild l'image!      │
└─────────────────────────────────────────────────────────┘
```

### Comment Vite intègre les variables

Au moment du build, Vite remplace toutes les occurrences de `import.meta.env.VITE_*` par les valeurs réelles:

**Avant le build** (dscoreApi.ts):
```typescript
const clientId = import.meta.env.VITE_DSCORE_CLIENT_ID;
```

**Après le build** (fichier JS compilé):
```javascript
const clientId = "8e956fa7-c675-42fc-afe0-01fc58ddeb0b";
```

Si les variables ne sont pas passées au build Docker, elles deviennent `undefined`:
```javascript
const clientId = undefined; // ❌ PAS BON!
```

## Configuration requise

### 1. Fichier .env sur le serveur

Votre fichier `.env` sur le serveur DOIT contenir:

```env
VITE_DSCORE_CLIENT_ID=8e956fa7-c675-42fc-afe0-01fc58ddeb0b
VITE_DSCORE_CLIENT_SECRET=akAFWoqfNyTC29eiRUMPd5LbUMEFwGkH2IFZ3VKV4g_-Py778Ijhe3MczS56uqebWYuhXSvk62oDUVCHgjxaEQ
VITE_DSCORE_ENVIRONMENT=sandbox
VITE_DSCORE_SANDBOX_BASE_HOST=https://api.r2.dscore.com
VITE_DSCORE_SANDBOX_AUTH_HOST=https://r2.dscore.com
VITE_DSCORE_PRODUCTION_BASE_HOST=https://api.r2.dscore.com
VITE_DSCORE_PRODUCTION_AUTH_HOST=https://r2.dscore.com
VITE_DSCORE_GLOBAL_HOST=https://api.dscore.com
VITE_DSCORE_CALLBACK_URL=https://dentalcloud.fr/settings
```

### 2. Redirect URL dans DS-Core Developer Portal

Allez sur [open.dscore.com](https://open.dscore.com) et ajoutez:
```
https://dentalcloud.fr/settings
```

## Workflow correct de déploiement

```bash
# 1. Modifier .env localement
vim .env

# 2. Commiter les changements de code (PAS le .env!)
git add .
git commit -m "Update DS-Core integration"
git push

# 3. Sur le serveur
ssh user@dentalcloud.fr
cd /chemin/vers/gb-dental

# 4. Pull les derniers changements
git pull

# 5. Copier/mettre à jour .env sur le serveur
# (le .env n'est pas dans git!)
vim .env

# 6. Rebuild et redéployer
./deploy-production.sh
```

## Checklist de déploiement

Avant de reconstruire l'image, vérifiez:

- [ ] Le fichier `.env` existe sur le serveur
- [ ] `VITE_DSCORE_CLIENT_ID` contient la bonne valeur
- [ ] `VITE_DSCORE_CALLBACK_URL` est `https://dentalcloud.fr/settings`
- [ ] Le Dockerfile contient les ARG et ENV pour DS-Core
- [ ] Le script `docker-build.sh` ou `deploy-production.sh` est exécutable
- [ ] Le Redirect URL est configuré dans DS-Core Developer Portal

Après le rebuild:

- [ ] Le conteneur démarre correctement
- [ ] Les logs ne montrent pas d'erreurs
- [ ] La console du navigateur montre "DS-Core Configuration" avec un clientId valide
- [ ] L'URL de connexion DS-Core contient le client_id

## Si le problème persiste

### Vérifier que les ARG sont passés au build

```bash
# Build manuel avec verbose
docker build \
  --progress=plain \
  --build-arg VITE_DSCORE_CLIENT_ID="8e956fa7-c675-42fc-afe0-01fc58ddeb0b" \
  --build-arg VITE_DSCORE_CALLBACK_URL="https://dentalcloud.fr/settings" \
  ... (autres args) \
  -t gb-dental:latest . 2>&1 | grep -i dscore
```

### Vérifier le contenu de l'image

```bash
# Inspecter l'image
docker run --rm gb-dental:latest sh -c "cat /usr/share/nginx/html/assets/*.js | grep -o 'dscore'"
```

Si vous ne voyez rien, les variables n'ont pas été intégrées.

### Debug avec une image temporaire

```bash
# Build avec l'étape de build uniquement
docker build --target builder -t gb-dental-debug .

# Lancer un shell dans l'image de build
docker run -it --rm gb-dental-debug sh

# Vérifier les variables
env | grep VITE_DSCORE
```

## Support rapide

**Message d'erreur**: `client_id=` vide dans l'URL

**Solution**: Rebuild l'image Docker avec `./deploy-production.sh`

**Temps estimé**: 2-3 minutes

**Commandes**:
```bash
ssh user@dentalcloud.fr
cd /chemin/vers/gb-dental
./deploy-production.sh
```

C'est tout! 🚀
