# 🚀 Installation Complète de GB Dental - Guide Étape par Étape

Guide détaillé pour installer GB Dental sur votre serveur, de l'achat du serveur jusqu'à l'application fonctionnelle.

---

## 📋 Vue d'ensemble

**Temps total estimé : 30-45 minutes**

### Ce que nous allons faire :
1. Préparer un serveur (VPS)
2. Installer les dépendances système
3. Configurer Docker
4. Installer et configurer GB Dental
5. Configurer un nom de domaine
6. Sécuriser avec SSL/HTTPS
7. Tester l'application

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
   - **Nom** : `gb-dental-prod`

5. **Notez l'adresse IP** de votre serveur (ex: `195.201.123.45`)

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

## PARTIE 3 : INSTALLATION DE GB DENTAL (15 min)

### Étape 3.1 : Créer un répertoire de travail

```bash
# Créer un dossier pour l'application
mkdir -p /opt/gb-dental
cd /opt/gb-dental
```

### Étape 3.2 : Télécharger les fichiers

**Option A : Si vous avez un repository Git**

```bash
# Cloner depuis votre repository
git clone https://github.com/votre-username/gb-dental.git .
```

**Option B : Transférer les fichiers depuis votre PC**

Sur votre PC local (dans le dossier gb-dental) :

```bash
# Compresser le projet
tar -czf gb-dental.tar.gz .

# Transférer vers le serveur
scp gb-dental.tar.gz root@195.201.123.45:/opt/gb-dental/

# Sur le serveur, décompresser
cd /opt/gb-dental
tar -xzf gb-dental.tar.gz
rm gb-dental.tar.gz
```

**Option C : Créer les fichiers manuellement (si nécessaire)**

Je vais lister les fichiers essentiels à créer si vous devez tout faire manuellement :

```bash
cd /opt/gb-dental

# Créer docker-compose.yml
nano docker-compose.yml
# Collez le contenu du fichier docker-compose.yml que j'ai créé
# Ctrl+X puis Y pour sauvegarder

# Créer kong.yml
nano kong.yml
# Collez le contenu du fichier kong.yml
# Ctrl+X puis Y pour sauvegarder

# Créer .env
nano .env
# Collez le contenu de .env.example et modifiez les valeurs
# Ctrl+X puis Y pour sauvegarder
```

### Étape 3.3 : Configuration de l'environnement

```bash
# Si vous avez .env.example
cp .env.example .env

# Sinon, créer .env directement
nano .env
```

**Contenu de .env à personnaliser :**

```bash
# SÉCURITÉ - Générer des valeurs aléatoires
POSTGRES_PASSWORD=VotreMotDePasseSuperSecret123!
JWT_SECRET=UnAutreSecretTresLongEtAleatoire456!

# Générer automatiquement des secrets sécurisés
# POSTGRES_PASSWORD=$(openssl rand -base64 32)
# JWT_SECRET=$(openssl rand -base64 32)

# URLs - À MODIFIER avec votre domaine
SITE_URL=http://195.201.123.45:5173
SUPABASE_PUBLIC_URL=http://195.201.123.45:8000
GOTRUE_URI_ALLOW_LIST=http://195.201.123.45:5173

# Clés Supabase (laisser par défaut pour commencer)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Email SMTP (optionnel au début)
SMTP_ADMIN_EMAIL=admin@votre-domaine.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-app-password
SMTP_SENDER_NAME=GB Dental

# Frontend
VITE_SUPABASE_URL=http://195.201.123.45:8000
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

**💡 Astuce : Générer des secrets sécurisés**

```bash
# Générer un mot de passe PostgreSQL
openssl rand -base64 32

# Générer un JWT Secret
openssl rand -base64 32

# Copier ces valeurs dans .env
```

### Étape 3.4 : Créer les répertoires nécessaires

```bash
# Créer les dossiers pour les migrations et fonctions
mkdir -p supabase/migrations
mkdir -p supabase/functions

# Si vous avez les migrations, les copier
# Sinon, elles seront ajoutées plus tard
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

## PARTIE 7 : CONFIGURER UN NOM DE DOMAINE (Optionnel, 15 min)

### Étape 7.1 : Acheter un nom de domaine

**Fournisseurs recommandés :**
- Namecheap (~10€/an)
- OVH (~8€/an)
- Gandi (~15€/an)
- Cloudflare (~10€/an)

Exemple : `gb-dental.com`

### Étape 7.2 : Configurer les DNS

Dans l'interface de votre registrar, créez ces enregistrements :

```
Type    Nom                     Valeur              TTL
A       @                       195.201.123.45      300
A       api                     195.201.123.45      300
CNAME   www                     gb-dental.com       300
```

**Remplacez `195.201.123.45` par votre IP**

**⏱️ Propagation DNS : 5-30 minutes**

### Étape 7.3 : Mettre à jour Nginx

```bash
# Éditer la configuration Nginx
nano /etc/nginx/sites-available/gb-dental
```

**Modifier la ligne `server_name` :**

```nginx
server_name gb-dental.com www.gb-dental.com;
```

**Ctrl+X puis Y**

```bash
# Tester et redémarrer
nginx -t
systemctl restart nginx
```

### Étape 7.4 : Installer SSL (HTTPS gratuit)

```bash
# Installer Certbot
apt install -y certbot python3-certbot-nginx

# Obtenir un certificat SSL automatiquement
certbot --nginx -d gb-dental.com -d www.gb-dental.com

# Suivre les instructions :
# 1. Entrez votre email
# 2. Acceptez les conditions
# 3. Choisissez de rediriger HTTP vers HTTPS (option 2)
```

**✅ Votre site est maintenant accessible en HTTPS !**

```
https://gb-dental.com
```

### Étape 7.5 : Mettre à jour les URLs dans .env

```bash
cd /opt/gb-dental
nano .env
```

**Modifier ces lignes :**

```bash
SITE_URL=https://gb-dental.com
SUPABASE_PUBLIC_URL=https://api.gb-dental.com
GOTRUE_URI_ALLOW_LIST=https://gb-dental.com,https://www.gb-dental.com

VITE_SUPABASE_URL=https://api.gb-dental.com
```

**Ctrl+X puis Y**

```bash
# Recompiler le frontend avec les nouvelles URLs
npm run build

# Redémarrer les services Docker
docker compose restart

# Redémarrer Nginx
systemctl restart nginx
```

---

## PARTIE 8 : CONFIGURATION EMAIL (Optionnel, 10 min)

### Étape 8.1 : Configuration Gmail

1. Allez sur https://myaccount.google.com/security
2. Activez la "Validation en deux étapes"
3. Allez dans "Mots de passe des applications"
4. Créez un mot de passe pour "Mail" sur "Autre"
5. **Copiez le mot de passe généré** (16 caractères)

### Étape 8.2 : Mettre à jour .env

```bash
nano /opt/gb-dental/.env
```

**Modifier ces lignes :**

```bash
SMTP_ADMIN_EMAIL=admin@gb-dental.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # Le mot de passe d'application
SMTP_SENDER_NAME=GB Dental
```

**Ctrl+X puis Y**

```bash
# Redémarrer les services
docker compose restart
```

### Étape 8.3 : Tester l'envoi d'email

```bash
# Test manuel via curl
curl -X POST http://localhost:8000/functions/v1/send-email \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test GB Dental",
    "html": "<h1>Email de test</h1>"
  }'
```

---

## PARTIE 9 : BACKUPS AUTOMATIQUES (10 min)

### Étape 9.1 : Créer un script de backup

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

### Étape 9.2 : Automatiser avec cron

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

## PARTIE 10 : MONITORING ET MAINTENANCE

### Étape 10.1 : Commandes de monitoring

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

### Étape 10.2 : Mise à jour de l'application

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
- ✅ PostgreSQL (base de données)
- ✅ Supabase (Auth, API, Storage, Functions)
- ✅ Nginx (serveur web)
- ✅ GB Dental Frontend compilé
- ✅ Firewall configuré
- ✅ SSL/HTTPS (si domaine configuré)
- ✅ Backups automatiques
- ✅ Email SMTP (si configuré)

### 🌐 URLs d'accès :

```
Application : http://votre-ip ou https://votre-domaine.com
Admin Panel : http://votre-ip:3000
API         : http://votre-ip:8000
```

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

Votre installation de GB Dental est terminée et fonctionnelle !

Vous pouvez maintenant :
- Créer des comptes utilisateurs
- Gérer vos bons de livraison
- Créer des factures
- Gérer votre stock
- Et bien plus !

**Bon travail ! 🚀**
