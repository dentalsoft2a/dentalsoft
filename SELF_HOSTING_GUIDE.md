# Guide d'auto-hébergement GB Dental

Ce guide vous explique comment héberger GB Dental sur votre propre serveur.

## 📋 Table des matières

1. [Option 1 : Supabase Self-Hosted (Recommandé)](#option-1--supabase-self-hosted-recommandé)
2. [Option 2 : PostgreSQL + Backend personnalisé](#option-2--postgresql--backend-personnalisé)
3. [Déploiement du Frontend](#déploiement-du-frontend)
4. [Configuration des Edge Functions](#configuration-des-edge-functions)
5. [Maintenance et Backups](#maintenance-et-backups)

---

## Option 1 : Supabase Self-Hosted (Recommandé)

Cette option utilise Supabase en self-hosted, ce qui inclut PostgreSQL, Auth, Edge Functions, et Storage.

### Prérequis

- **Serveur** : Linux (Ubuntu 22.04 recommandé)
- **RAM** : Minimum 4GB (8GB recommandé)
- **Stockage** : 20GB minimum
- **Docker** : Version 20.10+
- **Docker Compose** : Version 2.0+
- **Ports** : 80, 443, 5432, 8000

### Étape 1 : Installation de Docker

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation de Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Ajouter votre utilisateur au groupe docker
sudo usermod -aG docker $USER

# Installation de Docker Compose
sudo apt install docker-compose-plugin -y

# Redémarrer la session
newgrp docker
```

### Étape 2 : Cloner Supabase

```bash
# Créer un répertoire pour votre projet
mkdir ~/gb-dental
cd ~/gb-dental

# Cloner le repo Supabase
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
```

### Étape 3 : Configuration

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Générer des secrets sécurisés
cat <<EOF >> .env

# GB Dental Configuration
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
ANON_KEY=$(openssl rand -base64 32)
SERVICE_ROLE_KEY=$(openssl rand -base64 32)

# URLs publiques (à adapter)
SITE_URL=https://votre-domaine.com
SUPABASE_PUBLIC_URL=https://api.votre-domaine.com

# Email SMTP (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-app-password
SMTP_SENDER_NAME=GB Dental
EOF
```

### Étape 4 : Démarrer Supabase

```bash
# Démarrer tous les services
docker compose up -d

# Vérifier que tout fonctionne
docker compose ps

# Voir les logs
docker compose logs -f
```

Les services suivants seront disponibles :
- **Supabase Studio** : http://localhost:3000
- **API REST** : http://localhost:8000
- **PostgreSQL** : localhost:5432

### Étape 5 : Appliquer les migrations

```bash
# Copier vos migrations
cp -r /chemin/vers/gb-dental/supabase/migrations ~/gb-dental/migrations

# Se connecter au conteneur PostgreSQL
docker exec -it supabase-db psql -U postgres

# Ou utiliser un client SQL pour exécuter les migrations
# Dans l'ordre chronologique (par date dans le nom de fichier)
```

**Alternative avec psql depuis l'hôte :**

```bash
# Exécuter toutes les migrations
for file in ~/gb-dental/migrations/*.sql; do
  docker exec -i supabase-db psql -U postgres -d postgres < "$file"
  echo "Applied: $file"
done
```

### Étape 6 : Configurer les Edge Functions

```bash
# Créer le dossier des fonctions
mkdir -p ~/gb-dental/functions

# Copier vos edge functions
cp -r /chemin/vers/gb-dental/supabase/functions/* ~/gb-dental/functions/

# Les edge functions seront automatiquement détectées
# et chargées par le conteneur supabase-functions
```

### Étape 7 : Configurer un reverse proxy (Nginx)

```bash
# Installer Nginx
sudo apt install nginx certbot python3-certbot-nginx -y

# Créer la configuration
sudo nano /etc/nginx/sites-available/gb-dental
```

Contenu du fichier :

```nginx
# API Supabase
server {
    listen 80;
    server_name api.votre-domaine.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend GB Dental
server {
    listen 80;
    server_name votre-domaine.com;

    root /var/www/gb-dental/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Activer la configuration
sudo ln -s /etc/nginx/sites-available/gb-dental /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d votre-domaine.com -d api.votre-domaine.com
```

---

## Option 2 : PostgreSQL + Backend personnalisé

Si vous préférez une stack plus simple sans Supabase.

### Prérequis

- PostgreSQL 15+
- Node.js 18+
- Nginx

### Étape 1 : Installation de PostgreSQL

```bash
# Installer PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Créer la base de données
sudo -u postgres psql

CREATE DATABASE gb_dental;
CREATE USER gb_dental_user WITH PASSWORD 'votre_mot_de_passe_fort';
GRANT ALL PRIVILEGES ON DATABASE gb_dental TO gb_dental_user;
\q
```

### Étape 2 : Appliquer les migrations

```bash
# Se connecter à la base
psql -U gb_dental_user -d gb_dental -h localhost

# Ou exécuter les migrations
for file in supabase/migrations/*.sql; do
  psql -U gb_dental_user -d gb_dental -h localhost -f "$file"
done
```

### Étape 3 : Backend personnalisé

Vous devrez créer un backend Node.js/Express pour gérer :
- L'authentification (JWT)
- Les APIs REST
- Les edge functions

**Note** : Cette option nécessite beaucoup plus de développement personnalisé.

---

## Déploiement du Frontend

### Compilation

```bash
cd /chemin/vers/gb-dental

# Installer les dépendances
npm install

# Créer le fichier .env
cat > .env << EOF
VITE_SUPABASE_URL=https://api.votre-domaine.com
VITE_SUPABASE_ANON_KEY=votre_anon_key
EOF

# Compiler pour la production
npm run build
```

### Déploiement

```bash
# Copier les fichiers compilés sur le serveur
scp -r dist/* user@serveur:/var/www/gb-dental/

# Ou si vous êtes sur le serveur
sudo mkdir -p /var/www/gb-dental
sudo cp -r dist/* /var/www/gb-dental/
sudo chown -R www-data:www-data /var/www/gb-dental
```

---

## Configuration des Edge Functions

### Avec Supabase Self-Hosted

Les edge functions sont automatiquement chargées depuis le dossier monté dans Docker Compose.

### Variables d'environnement nécessaires

```bash
# Dans votre .env Supabase
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-app-password
SMTP_SENDER_NAME=GB Dental
```

### Test des edge functions

```bash
# Test de la fonction send-email
curl -X POST https://api.votre-domaine.com/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test",
    "html": "<h1>Test email</h1>"
  }'
```

---

## Maintenance et Backups

### Backups automatiques PostgreSQL

```bash
# Créer un script de backup
sudo nano /usr/local/bin/backup-gb-dental.sh
```

Contenu :

```bash
#!/bin/bash
BACKUP_DIR="/backups/gb-dental"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup de la base de données
docker exec supabase-db pg_dump -U postgres postgres > $BACKUP_DIR/backup_$DATE.sql

# Garder uniquement les 30 derniers backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete

echo "Backup terminé : backup_$DATE.sql"
```

```bash
# Rendre le script exécutable
sudo chmod +x /usr/local/bin/backup-gb-dental.sh

# Ajouter une tâche cron (tous les jours à 2h du matin)
sudo crontab -e

# Ajouter cette ligne :
0 2 * * * /usr/local/bin/backup-gb-dental.sh
```

### Monitoring

```bash
# Vérifier l'état des conteneurs
docker compose ps

# Voir les logs
docker compose logs -f supabase-db
docker compose logs -f supabase-auth
docker compose logs -f supabase-functions

# Utilisation de l'espace disque
df -h

# Utilisation des conteneurs
docker stats
```

### Mise à jour

```bash
cd ~/gb-dental/supabase/docker

# Sauvegarder d'abord
/usr/local/bin/backup-gb-dental.sh

# Mettre à jour Supabase
git pull origin master

# Redémarrer avec les nouvelles images
docker compose pull
docker compose up -d
```

---

## Configuration DNS

Pour que votre application soit accessible publiquement :

```
# Enregistrements DNS à créer
votre-domaine.com         A    VOTRE_IP_SERVEUR
api.votre-domaine.com     A    VOTRE_IP_SERVEUR
```

---

## Sécurité

### Firewall

```bash
# Installer UFW
sudo apt install ufw -y

# Autoriser SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Bloquer l'accès direct à PostgreSQL depuis l'extérieur
sudo ufw deny 5432/tcp

# Activer le firewall
sudo ufw enable
```

### Fail2ban (Protection contre les attaques)

```bash
# Installer fail2ban
sudo apt install fail2ban -y

# Créer la configuration
sudo nano /etc/fail2ban/jail.local
```

Contenu :

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
```

```bash
# Redémarrer fail2ban
sudo systemctl restart fail2ban
```

---

## Coûts estimés

### Hébergement VPS

- **Petit projet** (< 100 utilisateurs) : 10-20€/mois
  - VPS 2 CPU, 4GB RAM, 80GB SSD
  - Ex: Hetzner CX21, OVH VPS

- **Projet moyen** (100-1000 utilisateurs) : 30-50€/mois
  - VPS 4 CPU, 8GB RAM, 160GB SSD
  - Ex: Hetzner CX31, OVH VPS Elite

- **Grand projet** (> 1000 utilisateurs) : 100€+/mois
  - Serveur dédié ou VPS haute performance

### Domaine : ~10€/an

---

## Support et dépannage

### Problèmes courants

**Erreur 502 Bad Gateway**
```bash
# Vérifier que Supabase est démarré
docker compose ps

# Redémarrer si nécessaire
docker compose restart
```

**Base de données inaccessible**
```bash
# Vérifier les logs PostgreSQL
docker compose logs supabase-db

# Se connecter manuellement
docker exec -it supabase-db psql -U postgres
```

**Edge functions ne fonctionnent pas**
```bash
# Vérifier les logs
docker compose logs supabase-functions

# Vérifier que les fonctions sont montées
docker exec supabase-functions ls /home/deno/functions
```

---

## Ressources utiles

- [Documentation Supabase Self-Hosting](https://supabase.com/docs/guides/self-hosting)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Documentation](https://docs.docker.com/)

---

## Checklist avant la mise en production

- [ ] Backups automatiques configurés
- [ ] Certificats SSL installés
- [ ] Firewall configuré
- [ ] Fail2ban actif
- [ ] Monitoring en place
- [ ] Variables d'environnement sécurisées
- [ ] DNS configuré correctement
- [ ] Edge functions testées
- [ ] Tests d'inscription/connexion validés
- [ ] Politique de rétention des logs définie
