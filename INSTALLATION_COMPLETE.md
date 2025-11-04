# 🚀 Installation Complète de DentalCloud - Guide Étape par Étape

Guide détaillé pour installer DentalCloud (GB Dental) sur votre serveur avec le domaine **dentalcloud.fr**.

---

## 📋 Vue d'ensemble

**Temps total estimé : 45-60 minutes**

### Ce que nous allons faire :
1. Préparer un serveur (VPS)
2. Installer les dépendances système
3. Configurer Docker
4. Cloner et configurer DentalCloud depuis GitHub
5. Configurer les domaines dentalcloud.fr et api.dentalcloud.fr
6. Sécuriser avec SSL/HTTPS
7. Configurer Supabase Auth correctement
8. Tester l'application

---

## PARTIE 1 : PRÉPARATION DU SERVEUR (10 min)

### Étape 1.1 : Choisir et acheter un VPS

**Recommandations :**

| Fournisseur | Plan | Prix/mois | Specs |
|-------------|------|-----------|-------|
| **Hetzner** (Recommandé) | CX21 | ~6€ | 2 vCPU, 4GB RAM, 40GB SSD |
| **OVH** | VPS Value | ~7€ | 1 vCPU, 4GB RAM, 40GB SSD |
| **Contabo** | VPS S | ~6€ | 4 vCPU, 8GB RAM, 200GB SSD |
| **Oracle Cloud** | Free Tier | Gratuit | 4 vCPU, 24GB RAM (à vie!) |

**Pour ce guide, nous utiliserons Hetzner CX21.**

#### Actions à faire :
1. Allez sur https://www.hetzner.com
2. Créez un compte
3. Commandez un serveur **CX21** (Cloud)
4. Choisissez :
   - **Image** : Ubuntu 22.04
   - **Location** : Proche de vous (ex: Nuremberg pour l'Europe)
   - **SSH Key** : Créez-en une ou ajoutez-la plus tard
   - **Nom** : `dentalcloud-prod`

5. **Notez l'adresse IP** de votre serveur (ex: `195.201.123.45`)

6. **Configurez vos DNS immédiatement** (voir Partie 7 pour les détails) afin que la propagation DNS se fasse pendant l'installation

---

### Étape 1.2 : Se connecter au serveur

#### Sur Windows :
```powershell
# Télécharger et installer PuTTY
# Ou utiliser PowerShell (Windows 10+)
ssh root@195.201.123.45
```

#### Sur Mac/Linux :
```bash
ssh root@195.201.123.45
```

**Note** : Remplacez `195.201.123.45` par votre vraie IP.

**Premier login** : Vous devrez accepter la clé SSH (tapez `yes`)

---

### Étape 1.3 : Mise à jour du système

Une fois connecté au serveur :

```bash
# Mettre à jour la liste des paquets
apt update

# Mettre à jour tous les paquets installés
apt upgrade -y

# Installer les outils de base
apt install -y curl wget git nano ufw
```

⏱️ **Temps : 2-3 minutes**

---

## PARTIE 2 : INSTALLATION DE DOCKER (10 min)

### Étape 2.1 : Installation de Docker

```bash
# Télécharger et exécuter le script d'installation Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Vérifier l'installation
docker --version
```

**Résultat attendu :**
```
Docker version 24.0.7, build afdd53b
```

### Étape 2.2 : Installation de Docker Compose

```bash
# Docker Compose est déjà inclus dans Docker moderne
docker compose version
```

**Résultat attendu :**
```
Docker Compose version v2.23.0
```

### Étape 2.3 : Démarrer Docker automatiquement

```bash
# Activer Docker au démarrage
systemctl enable docker
systemctl start docker

# Vérifier que Docker fonctionne
docker ps
```

**Résultat attendu :**
```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
(vide pour l'instant)
```

---

## PARTIE 3 : INSTALLATION DE DENTALCLOUD (15 min)

### Étape 3.1 : Cloner le projet depuis GitHub

```bash
# Créer un dossier pour l'application
mkdir -p /opt/gb-dental
cd /opt/gb-dental

# Cloner le repository officiel DentalCloud
git clone https://github.com/dentalsoft2a/dentalsoft.git .

# Vérifier que les fichiers sont bien téléchargés
ls -la
```

**Vous devriez voir :**
- docker-compose.yml
- kong.yml
- package.json
- src/
- supabase/
- .env.example

### Étape 3.2 : Configuration de l'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Générer des secrets sécurisés
POSTGRES_PASS=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# Afficher les secrets générés (notez-les)
echo "POSTGRES_PASSWORD=$POSTGRES_PASS"
echo "JWT_SECRET=$JWT_SECRET"

# Éditer le fichier .env
nano .env
```

**Contenu de .env à personnaliser pour dentalcloud.fr :**

```bash
# SÉCURITÉ - Remplacer avec vos secrets générés ci-dessus
POSTGRES_PASSWORD=VotreSecretPostgresGenere
JWT_SECRET=VotreSecretJWTGenere

# URLs - Configuration pour dentalcloud.fr
SITE_URL=https://dentalcloud.fr
SUPABASE_PUBLIC_URL=https://api.dentalcloud.fr
GOTRUE_URI_ALLOW_LIST=https://dentalcloud.fr,https://api.dentalcloud.fr

# Clés Supabase - IMPORTANT: Générer de nouvelles clés avec le bon JWT_SECRET
# Ces clés doivent être regénérées avec votre JWT_SECRET
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MDgzMTIyMCwiZXhwIjo0OTE2NTA0ODIwLCJyb2xlIjoiYW5vbiJ9.VOTRE_SIGNATURE
SUPABASE_SERVICE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MDgzMTIyMCwiZXhwIjo0OTE2NTA0ODIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.VOTRE_SIGNATURE

# Email SMTP (optionnel, configurer plus tard)
SMTP_ADMIN_EMAIL=admin@dentalcloud.fr
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-app-password
SMTP_SENDER_NAME=DentalCloud

# Frontend - URL de l'API Supabase
VITE_SUPABASE_URL=https://api.dentalcloud.fr
VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MDgzMTIyMCwiZXhwIjo0OTE2NTA0ODIwLCJyb2xlIjoiYW5vbiJ9.VOTRE_SIGNATURE
```

**⚠️ IMPORTANT : Générer les bonnes clés JWT automatiquement**

Les clés JWT dans le .env doivent être signées avec votre JWT_SECRET. **Utilisez le script automatique inclus** :

```bash
# Le script est inclus dans le repository
cd /opt/gb-dental
chmod +x generate-jwt-keys.sh

# Exécuter le script
./generate-jwt-keys.sh
```

**Le script va :**
1. Lire votre JWT_SECRET depuis le .env
2. Générer automatiquement SUPABASE_ANON_KEY
3. Générer automatiquement SUPABASE_SERVICE_KEY
4. Afficher les valeurs à copier dans votre .env

**Ensuite, copiez les 3 lignes affichées dans votre .env :**
```bash
nano .env
# Remplacez les lignes SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY et VITE_SUPABASE_ANON_KEY
# Ctrl+X puis Y pour sauvegarder
```

**Si jwt-cli ne s'installe pas, utilisez cette méthode manuelle :**

1. Allez sur **https://jwt.io**
2. Dans la section **HEADER**, laissez :
   ```json
   {
     "alg": "HS256",
     "typ": "JWT"
   }
   ```
3. Dans la section **PAYLOAD**, collez (pour ANON_KEY) :
   ```json
   {
     "iss": "supabase",
     "role": "anon",
     "iat": 1760831220,
     "exp": 4916504820
   }
   ```
4. Dans la section **VERIFY SIGNATURE** (en bas), collez votre JWT_SECRET
5. Copiez le token généré (en bleu en haut à gauche) → c'est votre SUPABASE_ANON_KEY

6. Répétez pour SERVICE_KEY avec ce payload :
   ```json
   {
     "iss": "supabase",
     "role": "service_role",
     "iat": 1760831220,
     "exp": 4916504820
   }
   ```

**Pourquoi c'est nécessaire ?**
- Les JWT tokens doivent être signés avec votre JWT_SECRET pour que Supabase les valide
- Les tokens par défaut ne fonctionneront PAS avec votre secret personnalisé
- Sans tokens valides, l'authentification échouera

### Étape 3.3 : Vérifier les répertoires

```bash
# Les répertoires sont déjà créés par le clone Git
ls -la supabase/migrations/
ls -la supabase/functions/

# Les migrations SQL sont déjà présentes dans le repository
```

### Étape 3.5 : Démarrer les services Docker

```bash
# Démarrer tous les services en arrière-plan
docker compose up -d

# Voir les logs en temps réel
docker compose logs -f
```

**Résultat attendu :**
```
✔ Container gb-dental-postgres   Started
✔ Container gb-dental-auth       Started
✔ Container gb-dental-rest       Started
✔ Container gb-dental-kong       Started
✔ Container gb-dental-studio     Started
✔ Container gb-dental-functions  Started
...
```

**Appuyez sur `Ctrl+C` pour quitter les logs**

### Étape 3.6 : Vérifier que tout fonctionne

```bash
# Vérifier l'état des conteneurs
docker compose ps
```

**Résultat attendu : Tous les services doivent être "Up"**

```bash
# Attendre que PostgreSQL soit prêt (important!)
sleep 15

# Vérifier que PostgreSQL répond
docker compose exec postgres pg_isready -U postgres
```

**Résultat attendu :**
```
/var/run/postgresql:5432 - accepting connections
```

### Étape 3.7 : Appliquer les migrations SQL

```bash
# Si vous avez des migrations dans supabase/migrations/
cd /opt/gb-dental

# Appliquer toutes les migrations dans l'ordre
for migration in supabase/migrations/*.sql; do
  echo "Applying: $(basename $migration)"
  docker compose exec -T postgres psql -U postgres -d postgres < "$migration"
done

# Vérifier qu'il n'y a pas d'erreurs
echo "✅ Migrations appliquées"
```

**⚠️ Si vous n'avez pas encore les migrations :**

Vous pouvez les créer plus tard via Supabase Studio (http://votre-ip:3000)

---

## PARTIE 4 : INSTALLER NODE.JS ET LE FRONTEND (10 min)

### Étape 4.1 : Installer Node.js

```bash
# Installer Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Vérifier l'installation
node --version
npm --version
```

**Résultat attendu :**
```
v20.10.0
10.2.3
```

### Étape 4.2 : Compiler le frontend

```bash
cd /opt/gb-dental

# Installer les dépendances
npm install

# Compiler pour la production
npm run build
```

**⏱️ Temps : 2-3 minutes**

**Résultat attendu :**
```
✓ built in 8s
dist/index.html
dist/assets/...
```

### Étape 4.3 : Installer un serveur web (Nginx)

```bash
# Installer Nginx
apt install -y nginx

# Créer la configuration pour GB Dental
nano /etc/nginx/sites-available/gb-dental
```

**Collez cette configuration :**

```nginx
# Frontend GB Dental
server {
    listen 80;
    server_name _;  # Accepte toutes les requêtes

    root /opt/gb-dental/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy vers l'API Supabase
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Ctrl+X puis Y pour sauvegarder**

```bash
# Activer la configuration
ln -s /etc/nginx/sites-available/gb-dental /etc/nginx/sites-enabled/

# Supprimer la config par défaut
rm /etc/nginx/sites-enabled/default

# Tester la configuration
nginx -t

# Redémarrer Nginx
systemctl restart nginx
```

**Résultat attendu :**
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## PARTIE 5 : CONFIGURATION DU FIREWALL (5 min)

### Étape 5.1 : Configurer UFW (firewall)

```bash
# Installer UFW si pas déjà fait
apt install -y ufw

# Autoriser SSH (IMPORTANT!)
ufw allow 22/tcp

# Autoriser HTTP
ufw allow 80/tcp

# Autoriser HTTPS (pour plus tard)
ufw allow 443/tcp

# Activer le firewall
ufw enable

# Vérifier les règles
ufw status
```

**Résultat attendu :**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

---

## PARTIE 6 : TESTER L'APPLICATION (5 min)

### Étape 6.1 : Accéder à l'application

Ouvrez votre navigateur et allez à :

```
http://195.201.123.45
```

**Remplacez par votre vraie IP !**

**Vous devriez voir :**
- La page d'accueil de GB Dental
- Un formulaire de connexion/inscription

### Étape 6.2 : Tester l'inscription

1. Cliquez sur "Créer un compte"
2. Remplissez le formulaire :
   - Prénom : Test
   - Nom : User
   - Laboratoire : Mon Labo
   - Email : test@example.com
   - Mot de passe : test123456

3. Cliquez sur "Créer mon compte"

**✅ Si ça fonctionne :** Vous êtes redirigé vers le dashboard

**❌ Si erreur :** Voir la section Dépannage ci-dessous

### Étape 6.3 : Accéder à Supabase Studio

```
http://195.201.123.45:3000
```

Vous pouvez voir :
- Les tables de la base de données
- Les utilisateurs créés
- Les logs
- Etc.

---

## PARTIE 7 : CONFIGURER LE DOMAINE dentalcloud.fr (OBLIGATOIRE, 20 min)

### Étape 7.1 : Vérifier votre domaine

Vous possédez déjà **dentalcloud.fr**. Connectez-vous à votre registrar (OVH, Gandi, Cloudflare, etc.)

### Étape 7.2 : Configurer les DNS

Dans l'interface de votre registrar, créez ces enregistrements DNS :

```
Type    Nom                     Valeur              TTL
A       @                       VOTRE_IP_SERVEUR    300
A       api                     VOTRE_IP_SERVEUR    300
A       www                     VOTRE_IP_SERVEUR    300
```

**Exemple avec votre IP :**
```
Type    Nom                     Valeur              TTL
A       @                       195.201.123.45      300
A       api                     195.201.123.45      300
A       www                     195.201.123.45      300
```

**⏱️ Propagation DNS : 5-30 minutes**

**Vérifier la propagation DNS :**
```bash
# Tester dentalcloud.fr
dig dentalcloud.fr +short

# Tester api.dentalcloud.fr
dig api.dentalcloud.fr +short

# Les deux doivent retourner votre IP
```

### Étape 7.3 : Configurer Nginx pour deux domaines

```bash
# Supprimer la config temporaire si elle existe
rm -f /etc/nginx/sites-enabled/gb-dental

# Créer la configuration pour le frontend (dentalcloud.fr)
nano /etc/nginx/sites-available/dentalcloud-frontend
```

**Collez cette configuration :**

```nginx
# Frontend DentalCloud
server {
    listen 80;
    server_name dentalcloud.fr www.dentalcloud.fr;

    root /opt/gb-dental/dist;
    index index.html;

    # Gestion des routes React
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache pour les assets statiques
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Ctrl+X puis Y pour sauvegarder**

```bash
# Créer la configuration pour l'API (api.dentalcloud.fr)
nano /etc/nginx/sites-available/dentalcloud-api
```

**Collez cette configuration :**

```nginx
# API Supabase
server {
    listen 80;
    server_name api.dentalcloud.fr;

    # Proxy vers Kong (API Gateway Supabase)
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Headers pour WebSocket (Auth Supabase)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

**Ctrl+X puis Y pour sauvegarder**

```bash
# Activer les deux configurations
ln -s /etc/nginx/sites-available/dentalcloud-frontend /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/dentalcloud-api /etc/nginx/sites-enabled/

# Tester la configuration
nginx -t

# Redémarrer Nginx
systemctl restart nginx
```

**Résultat attendu :**
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Étape 7.4 : Installer SSL (HTTPS obligatoire)

```bash
# Installer Certbot
apt install -y certbot python3-certbot-nginx

# Obtenir des certificats SSL pour les deux domaines
certbot --nginx -d dentalcloud.fr -d www.dentalcloud.fr
certbot --nginx -d api.dentalcloud.fr

# Suivre les instructions pour chaque commande :
# 1. Entrez votre email
# 2. Acceptez les conditions (Y)
# 3. Acceptez/Refusez le partage d'email (N recommandé)
# 4. Les certificats seront automatiquement installés
```

**✅ Vos domaines sont maintenant accessibles en HTTPS !**

```
https://dentalcloud.fr          → Frontend
https://api.dentalcloud.fr      → API Supabase
```

### Étape 7.5 : Renouvellement automatique SSL

```bash
# Tester le renouvellement
certbot renew --dry-run

# Activer le renouvellement automatique (déjà actif avec systemd)
systemctl status certbot.timer
```

### Étape 7.6 : Recompiler le frontend avec HTTPS

```bash
cd /opt/gb-dental

# Le .env a déjà les bonnes URLs HTTPS configurées à l'étape 3.2
# Vérifier quand même :
cat .env | grep VITE

# Devrait afficher :
# VITE_SUPABASE_URL=https://api.dentalcloud.fr
# VITE_SUPABASE_ANON_KEY=...

# Recompiler le frontend
npm run build

# Redémarrer les services Docker
docker compose restart

# Redémarrer Nginx
systemctl restart nginx
```

**🎉 Votre application est maintenant accessible sur https://dentalcloud.fr !**

---

## PARTIE 8 : SÉCURISER SUPABASE AUTH (CRITIQUE, 10 min)

### Problème : Accès direct à Supabase Studio

**⚠️ IMPORTANT :** Par défaut, Supabase Studio est accessible publiquement sur le port 3000. C'est un risque de sécurité !

### Étape 8.1 : Bloquer l'accès externe à Supabase Studio

```bash
# Modifier docker-compose.yml pour n'exposer Studio qu'en local
nano /opt/gb-dental/docker-compose.yml
```

**Trouver la section `studio:` et modifier les ports :**

```yaml
studio:
  container_name: gb-dental-studio
  image: supabase/studio:latest
  restart: unless-stopped
  ports:
    - "127.0.0.1:3000:3000"  # ← Ajouter 127.0.0.1: devant
  environment:
    # ...
```

**Ctrl+X puis Y pour sauvegarder**

```bash
# Redémarrer les services
docker compose down
docker compose up -d
```

### Étape 8.2 : Accéder à Supabase Studio via tunnel SSH

**Depuis votre ordinateur local :**

```bash
# Sur Windows (PowerShell) :
ssh -L 3000:localhost:3000 root@VOTRE_IP_SERVEUR

# Sur Mac/Linux :
ssh -L 3000:localhost:3000 root@VOTRE_IP_SERVEUR
```

**Maintenant, ouvrez dans votre navigateur :**
```
http://localhost:3000
```

**✅ Vous avez maintenant accès à Supabase Studio de manière sécurisée !**

### Étape 8.3 : Configurer les URL d'authentification correctes

Le problème principal est que les utilisateurs peuvent actuellement accéder directement à Supabase via le lien, contournant votre application.

**Vérifier la configuration Auth :**

```bash
cd /opt/gb-dental
cat .env | grep GOTRUE
```

**Devrait afficher :**
```
GOTRUE_URI_ALLOW_LIST=https://dentalcloud.fr,https://api.dentalcloud.fr
```

**Si ce n'est pas le cas, corrigez :**

```bash
nano .env
```

**Assurez-vous que ces lignes sont présentes :**

```bash
# Configuration Auth stricte
GOTRUE_URI_ALLOW_LIST=https://dentalcloud.fr,https://api.dentalcloud.fr
GOTRUE_SITE_URL=https://dentalcloud.fr
GOTRUE_EXTERNAL_EMAIL_ENABLED=true
GOTRUE_DISABLE_SIGNUP=false
```

**Ctrl+X puis Y**

```bash
# Redémarrer les services
docker compose restart
```

### Étape 8.4 : Tester la connexion sécurisée

1. Allez sur **https://dentalcloud.fr**
2. Créez un compte :
   - Prénom : Test
   - Nom : User
   - Laboratoire : Mon Labo
   - Email : test@dentalcloud.fr
   - Mot de passe : TestSecure123!

3. **✅ Si ça fonctionne :** Vous êtes redirigé vers le dashboard
4. **❌ Si erreur :** Voir les logs :
   ```bash
   docker compose logs auth | tail -50
   ```

### Étape 8.5 : Bloquer l'accès direct aux ports Docker

```bash
# Vérifier les ports exposés
docker compose ps

# Configurer le firewall pour bloquer les ports internes
ufw deny 5432  # PostgreSQL
ufw deny 8000  # Kong (sauf via Nginx)
ufw deny 3000  # Studio (bloqué, accès via SSH tunnel uniquement)
ufw deny 9999  # Rest API
ufw deny 54321 # Auth

# Reload firewall
ufw reload

# Vérifier
ufw status numbered
```

**⚠️ NOTE :** Le port 8000 est accessible uniquement via le proxy Nginx sur api.dentalcloud.fr (HTTPS), pas directement.

---

## PARTIE 9 : CONFIGURATION EMAIL (Optionnel, 10 min)

### Étape 9.1 : Configuration Gmail

1. Allez sur https://myaccount.google.com/security
2. Activez la "Validation en deux étapes"
3. Allez dans "Mots de passe des applications"
4. Créez un mot de passe pour "Mail" sur "Autre"
5. **Copiez le mot de passe généré** (16 caractères)

### Étape 9.2 : Mettre à jour .env

```bash
nano /opt/gb-dental/.env
```

**Modifier ces lignes :**

```bash
SMTP_ADMIN_EMAIL=admin@dentalcloud.fr
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # Le mot de passe d'application (sans espaces)
SMTP_SENDER_NAME=DentalCloud
```

**Ctrl+X puis Y**

```bash
# Redémarrer les services
docker compose restart
```

### Étape 9.3 : Tester l'envoi d'email

```bash
# Test manuel via l'API locale
curl -X POST http://localhost:8000/functions/v1/send-email \
  -H "Authorization: Bearer VOTRE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@dentalcloud.fr",
    "subject": "Test DentalCloud",
    "html": "<h1>Email de test depuis DentalCloud</h1><p>Si vous recevez ceci, la configuration email fonctionne !</p>"
  }'
```

**✅ Si vous recevez l'email, la configuration est correcte !**

---

## PARTIE 10 : BACKUPS AUTOMATIQUES (10 min)

### Étape 10.1 : Créer un script de backup

```bash
# Créer le script
nano /usr/local/bin/backup-gb-dental.sh
```

**Collez ce script :**

```bash
#!/bin/bash
BACKUP_DIR="/backups/gb-dental"
DATE=$(date +%Y%m%d_%H%M%S)

# Créer le répertoire de backup
mkdir -p $BACKUP_DIR

# Backup de la base de données
docker compose -f /opt/gb-dental/docker-compose.yml exec -T postgres \
  pg_dump -U postgres postgres > $BACKUP_DIR/backup_$DATE.sql

# Compresser le backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Garder uniquement les 30 derniers backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "✅ Backup terminé : backup_$DATE.sql.gz"
```

**Ctrl+X puis Y**

```bash
# Rendre le script exécutable
chmod +x /usr/local/bin/backup-gb-dental.sh

# Tester le script
/usr/local/bin/backup-gb-dental.sh
```

**Résultat attendu :**
```
✅ Backup terminé : backup_20241103_120000.sql.gz
```

### Étape 10.2 : Automatiser avec cron

```bash
# Éditer le crontab
crontab -e

# Choisir nano (option 1) si demandé
```

**Ajouter cette ligne à la fin :**

```bash
# Backup quotidien à 2h du matin
0 2 * * * /usr/local/bin/backup-gb-dental.sh >> /var/log/gb-dental-backup.log 2>&1
```

**Ctrl+X puis Y**

```bash
# Vérifier que le cron est bien créé
crontab -l
```

---

## PARTIE 11 : MONITORING ET MAINTENANCE

### Étape 11.1 : Commandes de monitoring

```bash
# Voir l'état des conteneurs
docker compose -f /opt/gb-dental/docker-compose.yml ps

# Voir les logs
docker compose -f /opt/gb-dental/docker-compose.yml logs -f

# Voir l'utilisation des ressources
docker stats

# Voir l'espace disque
df -h

# Voir l'utilisation RAM
free -h
```

### Étape 11.2 : Mise à jour de l'application

```bash
cd /opt/gb-dental

# Faire un backup avant
/usr/local/bin/backup-gb-dental.sh

# Arrêter les services
docker compose down

# Mettre à jour le code (si Git)
git pull

# Ou transférer les nouveaux fichiers

# Recompiler le frontend
npm install
npm run build

# Appliquer les nouvelles migrations si nécessaire
for migration in supabase/migrations/*.sql; do
  docker compose exec -T postgres psql -U postgres -d postgres < "$migration"
done

# Redémarrer
docker compose up -d
```

---

## 🎯 RÉSUMÉ - INSTALLATION TERMINÉE !

### ✅ Ce qui est installé et fonctionnel :

- ✅ Serveur VPS Ubuntu 22.04
- ✅ Docker et Docker Compose
- ✅ PostgreSQL (base de données sécurisée)
- ✅ Supabase complet (Auth, API, Storage, Functions)
- ✅ Nginx comme reverse proxy
- ✅ DentalCloud Frontend React compilé
- ✅ Firewall UFW configuré
- ✅ SSL/HTTPS avec Let's Encrypt
- ✅ Domaines dentalcloud.fr et api.dentalcloud.fr configurés
- ✅ Supabase Auth sécurisé (pas d'accès direct)
- ✅ Supabase Studio accessible via SSH tunnel uniquement
- ✅ Backups automatiques quotidiens
- ✅ Email SMTP (si configuré)

### 🌐 URLs d'accès :

```
Application Frontend : https://dentalcloud.fr
API Supabase         : https://api.dentalcloud.fr
Admin Panel (SSH)    : http://localhost:3000 (via tunnel SSH uniquement)
```

### 🔐 Sécurité :

- ✅ Tous les ports internes bloqués par le firewall
- ✅ Accès HTTPS uniquement
- ✅ Supabase Studio accessible uniquement via tunnel SSH
- ✅ Auth configuré avec GOTRUE_URI_ALLOW_LIST
- ✅ JWT secrets uniques générés
- ✅ Certificats SSL automatiques

### 📊 Statistiques du serveur :

```bash
# Voir les stats en temps réel
docker stats

# Voir l'espace disque
df -h

# Voir les processus
htop  # (installer avec: apt install htop)
```

---

## 🔧 DÉPANNAGE

### Problème 1 : "Cannot connect to database"

```bash
# Vérifier que PostgreSQL est démarré
docker compose ps postgres

# Voir les logs PostgreSQL
docker compose logs postgres

# Redémarrer PostgreSQL
docker compose restart postgres
```

### Problème 2 : "Port 8000 already in use"

```bash
# Voir quel processus utilise le port
sudo netstat -tlnp | grep :8000

# Arrêter le processus ou changer le port dans docker-compose.yml
```

### Problème 3 : "502 Bad Gateway"

```bash
# Vérifier que tous les services sont démarrés
docker compose ps

# Redémarrer tous les services
docker compose restart

# Vérifier les logs Nginx
tail -f /var/log/nginx/error.log
```

### Problème 4 : L'inscription ne fonctionne pas

```bash
# Vérifier les logs Auth
docker compose logs auth

# Vérifier que les migrations sont appliquées
docker compose exec postgres psql -U postgres -d postgres -c "\dt"

# Réappliquer les migrations
for migration in supabase/migrations/*.sql; do
  docker compose exec -T postgres psql -U postgres -d postgres < "$migration"
done
```

### Problème 5 : Les emails ne partent pas

```bash
# Vérifier la configuration SMTP
cat .env | grep SMTP

# Tester manuellement
docker compose exec functions curl -X POST http://localhost:9000/send-email \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","html":"Test"}'

# Voir les logs des functions
docker compose logs functions
```

---

## 📞 SUPPORT

Si vous avez des problèmes :

1. **Consultez les logs :**
   ```bash
   docker compose logs -f
   ```

2. **Vérifiez la configuration :**
   ```bash
   cat /opt/gb-dental/.env
   ```

3. **Redémarrez tout :**
   ```bash
   docker compose down
   docker compose up -d
   ```

4. **Consultez la documentation :**
   - SELF_HOSTING_GUIDE.md
   - QUICKSTART_SELFHOSTING.md

---

## 🎉 FÉLICITATIONS !

Votre installation de **DentalCloud** est terminée et fonctionnelle !

### 🚀 Prochaines étapes :

1. **Créez votre premier compte admin** sur https://dentalcloud.fr
2. **Configurez votre profil** et vos paramètres de laboratoire
3. **Ajoutez vos premiers dentistes** et patients
4. **Créez vos premiers bons de livraison**
5. **Générez vos premières factures**

### 📱 Fonctionnalités disponibles :

- ✅ Gestion des dentistes et patients
- ✅ Bons de livraison avec catalogue
- ✅ Factures et proformas
- ✅ Gestion des stocks (produits et ressources)
- ✅ Système de notes de crédit
- ✅ Calendrier et rendez-vous
- ✅ Système d'aide intégré
- ✅ Dashboard avec statistiques
- ✅ Export PDF des documents

### 🔧 Commandes utiles à retenir :

```bash
# Voir l'état de l'application
docker compose -f /opt/gb-dental/docker-compose.yml ps

# Voir les logs en temps réel
docker compose -f /opt/gb-dental/docker-compose.yml logs -f

# Redémarrer l'application
docker compose -f /opt/gb-dental/docker-compose.yml restart

# Mettre à jour depuis GitHub
cd /opt/gb-dental && git pull && npm install && npm run build && docker compose restart

# Accéder à Supabase Studio (depuis votre PC)
ssh -L 3000:localhost:3000 root@VOTRE_IP_SERVEUR

# Faire un backup manuel
/usr/local/bin/backup-gb-dental.sh
```

### 📞 En cas de problème :

1. Consultez les logs : `docker compose logs -f`
2. Vérifiez la config : `cat /opt/gb-dental/.env`
3. Testez la connexion : `curl -I https://dentalcloud.fr`
4. Redémarrez les services : `docker compose restart`

**Votre application est maintenant en production et sécurisée ! 🚀**

---

**Repository GitHub :** https://github.com/dentalsoft2a/dentalsoft.git
**Documentation :** Voir SELF_HOSTING_GUIDE.md et QUICKSTART_SELFHOSTING.md
