# Instructions de déploiement Docker avec variables d'environnement DS-Core

## Vue d'ensemble

Ce guide explique comment déployer l'application GB Dental avec Docker en s'assurant que toutes les variables d'environnement (y compris DS-Core et 3Shape) sont correctement intégrées dans l'image Docker.

## Prérequis

- Docker installé (version 20.10 ou supérieure)
- Docker Compose installé (optionnel mais recommandé)
- Fichier `.env` configuré avec vos credentials

## Structure des fichiers

```
.
├── Dockerfile                      # Configuration Docker
├── docker-compose.yml              # Configuration Docker Compose
├── docker-build.sh                 # Script de build automatisé
├── .env                            # Variables d'environnement (ne pas commiter!)
├── .env.example                    # Template des variables
└── INSTRUCTIONS_DEPLOIEMENT_DOCKER.md
```

## Méthode 1: Build avec script automatisé (Recommandé)

### Étape 1: Configurer les variables d'environnement

Si vous n'avez pas encore de fichier `.env`, copiez le template:

```bash
cp .env.example .env
```

Éditez le fichier `.env` avec vos vraies valeurs:

```bash
nano .env
# ou
vim .env
```

Vérifiez que toutes les variables sont définies:

```bash
cat .env | grep DSCORE
```

### Étape 2: Construire l'image Docker

Utilisez le script automatisé:

```bash
./docker-build.sh
```

Ce script:
1. Charge automatiquement toutes les variables depuis `.env`
2. Les passe comme build arguments au Dockerfile
3. Construit l'image `gb-dental:latest`

### Étape 3: Lancer le conteneur

```bash
docker run -d -p 3000:3000 --name gb-dental gb-dental:latest
```

### Étape 4: Vérifier que ça fonctionne

```bash
# Voir les logs
docker logs -f gb-dental

# Vérifier que le conteneur tourne
docker ps | grep gb-dental

# Tester l'application
curl http://localhost:3000
```

Ouvrez votre navigateur: `http://localhost:3000`

## Méthode 2: Build avec Docker Compose

### Étape 1: Configurer .env

Même étape que la Méthode 1.

### Étape 2: Construire et lancer avec Docker Compose

```bash
docker-compose up -d --build
```

Docker Compose va:
1. Lire les variables depuis `.env`
2. Les passer comme build arguments
3. Construire l'image
4. Lancer le conteneur

### Étape 3: Gérer le conteneur

```bash
# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down

# Redémarrer
docker-compose restart

# Reconstruire complètement
docker-compose up -d --build --force-recreate
```

## Méthode 3: Build manuel avec Docker

Si vous préférez faire le build manuellement:

```bash
docker build \
  --build-arg VITE_SUPABASE_URL="https://eovmrvtiizyhyzcmpvov.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="votre-anon-key" \
  --build-arg VITE_DSCORE_CLIENT_ID="8e956fa7-c675-42fc-afe0-01fc58ddeb0b" \
  --build-arg VITE_DSCORE_CLIENT_SECRET="votre-secret" \
  --build-arg VITE_DSCORE_ENVIRONMENT="sandbox" \
  --build-arg VITE_DSCORE_SANDBOX_BASE_HOST="https://api.r2.dscore.com" \
  --build-arg VITE_DSCORE_SANDBOX_AUTH_HOST="https://r2.dscore.com" \
  --build-arg VITE_DSCORE_PRODUCTION_BASE_HOST="https://api.r2.dscore.com" \
  --build-arg VITE_DSCORE_PRODUCTION_AUTH_HOST="https://r2.dscore.com" \
  --build-arg VITE_DSCORE_GLOBAL_HOST="https://api.dscore.com" \
  --build-arg VITE_DSCORE_CALLBACK_URL="http://localhost:3000/settings" \
  --build-arg VITE_3SHAPE_CLIENT_ID="votre-3shape-client-id" \
  --build-arg VITE_3SHAPE_CLIENT_SECRET="votre-3shape-secret" \
  --build-arg VITE_3SHAPE_API_URL="https://api.3shapecommunicate.com" \
  --build-arg VITE_3SHAPE_AUTH_URL="https://auth.3shapecommunicate.com" \
  --build-arg VITE_3SHAPE_CALLBACK_URL="http://localhost:3000/settings/3shape-callback" \
  -t gb-dental:latest .
```

## Important: Callback URLs pour la production

⚠️ **CRITIQUE**: Quand vous déployez en production, n'oubliez pas de:

1. **Mettre à jour le CALLBACK_URL dans .env**:
   ```env
   VITE_DSCORE_CALLBACK_URL=https://votre-domaine.com/settings
   VITE_3SHAPE_CALLBACK_URL=https://votre-domaine.com/settings/3shape-callback
   ```

2. **Configurer le même Callback URL dans DS-Core Developer Portal**:
   - Allez sur [open.dscore.com](https://open.dscore.com)
   - My Apps > Votre application
   - Ajoutez: `https://votre-domaine.com/settings`

3. **Changer l'environnement DS-Core**:
   ```env
   VITE_DSCORE_ENVIRONMENT=production
   ```

4. **Reconstruire l'image Docker** avec les nouvelles valeurs

## Vérification des variables dans le conteneur

Pour vérifier que les variables sont bien intégrées dans le build:

```bash
# Lancer un shell dans le conteneur
docker exec -it gb-dental sh

# Les variables sont "baked in" dans les fichiers JavaScript compilés
# Vous ne pouvez pas les voir comme des variables d'environnement runtime
# car Vite les intègre au moment du build

# Mais vous pouvez vérifier les fichiers JS:
cd /usr/share/nginx/html/assets
grep -r "dscore" .
```

## Commandes Docker utiles

```bash
# Voir tous les conteneurs
docker ps -a

# Arrêter le conteneur
docker stop gb-dental

# Démarrer le conteneur
docker start gb-dental

# Supprimer le conteneur
docker rm gb-dental

# Supprimer l'image
docker rmi gb-dental:latest

# Voir les logs en temps réel
docker logs -f gb-dental

# Voir les logs des 100 dernières lignes
docker logs --tail 100 gb-dental

# Inspecter le conteneur
docker inspect gb-dental

# Voir l'utilisation des ressources
docker stats gb-dental
```

## Déploiement sur un serveur

### Option 1: Avec Docker Hub

```bash
# 1. Tag l'image
docker tag gb-dental:latest votre-username/gb-dental:latest

# 2. Push sur Docker Hub
docker push votre-username/gb-dental:latest

# 3. Sur le serveur, pull l'image
docker pull votre-username/gb-dental:latest

# 4. Lancer le conteneur
docker run -d -p 3000:3000 --name gb-dental votre-username/gb-dental:latest
```

### Option 2: Export/Import de l'image

```bash
# 1. Exporter l'image
docker save gb-dental:latest | gzip > gb-dental.tar.gz

# 2. Copier sur le serveur
scp gb-dental.tar.gz user@serveur:/tmp/

# 3. Sur le serveur, importer l'image
gunzip -c /tmp/gb-dental.tar.gz | docker load

# 4. Lancer le conteneur
docker run -d -p 3000:3000 --name gb-dental gb-dental:latest
```

### Option 3: Avec docker-compose sur le serveur

```bash
# 1. Copier les fichiers nécessaires
scp docker-compose.yml .env Dockerfile user@serveur:/app/

# 2. Sur le serveur
cd /app
docker-compose up -d --build
```

## Configuration Nginx en production

Si vous utilisez Nginx comme reverse proxy devant Docker:

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Dépannage

### Problème: Les variables DS-Core ne sont pas chargées

**Solution**: Les variables Vite sont intégrées au moment du build, pas au runtime.

1. Vérifiez que `.env` contient toutes les variables
2. Reconstruisez l'image:
   ```bash
   docker-compose down
   docker-compose up -d --build --force-recreate
   ```

### Problème: Erreur "404 Page Not Found" sur DS-Core

**Causes possibles**:

1. **CALLBACK_URL incorrect dans .env**
   - Doit correspondre exactement à celui configuré dans DS-Core Portal
   - Pour Docker: utilisez le port 3000 ou votre domaine de production

2. **Image non reconstruite après changement de .env**
   - Solution: Reconstruire l'image

3. **Variables non passées au build**
   - Vérifiez que toutes les ARG/ENV sont dans le Dockerfile
   - Utilisez `docker-build.sh` ou `docker-compose`

### Problème: Le conteneur démarre puis s'arrête

```bash
# Voir les logs d'erreur
docker logs gb-dental

# Voir pourquoi le conteneur s'est arrêté
docker inspect gb-dental | grep -A 10 State
```

### Problème: Port 3000 déjà utilisé

```bash
# Voir ce qui utilise le port
lsof -i :3000

# Utiliser un autre port
docker run -d -p 8080:3000 --name gb-dental gb-dental:latest
```

## Sécurité

⚠️ **IMPORTANT - Sécurité des secrets**:

1. **Ne jamais commiter `.env` dans Git**
   - Vérifiez que `.env` est dans `.gitignore`

2. **Utiliser des secrets Docker pour la production**:
   ```yaml
   services:
     gb-dental:
       secrets:
         - dscore_client_secret
         - dscore_client_id

   secrets:
     dscore_client_secret:
       external: true
     dscore_client_id:
       external: true
   ```

3. **Changer les secrets régulièrement**
   - Régénérez vos Client IDs et Secrets tous les 6 mois

4. **Limiter l'accès aux images Docker**
   - Utilisez des registres privés pour les images contenant des secrets

## Monitoring

Pour monitorer votre conteneur en production:

```bash
# Installer cAdvisor (monitoring Docker)
docker run -d \
  --name=cadvisor \
  --volume=/:/rootfs:ro \
  --volume=/var/run:/var/run:ro \
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  --publish=8080:8080 \
  google/cadvisor:latest

# Accéder au dashboard: http://localhost:8080
```

## Support

Si vous rencontrez des problèmes:

1. Vérifiez les logs: `docker logs -f gb-dental`
2. Vérifiez que toutes les variables sont dans `.env`
3. Reconstruisez l'image depuis zéro
4. Consultez la documentation DS-Core: [open.dscore.com](https://open.dscore.com)

## Checklist de déploiement

- [ ] Fichier `.env` configuré avec toutes les variables
- [ ] Callback URLs mis à jour pour l'environnement cible
- [ ] Callback URLs configurés dans DS-Core Developer Portal
- [ ] Image Docker construite avec `./docker-build.sh` ou `docker-compose`
- [ ] Conteneur lancé et accessible
- [ ] Logs vérifiés (pas d'erreurs)
- [ ] Test de connexion DS-Core fonctionnel
- [ ] Backup de l'image Docker créé
- [ ] Documentation mise à jour
