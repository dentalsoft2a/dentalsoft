# 🚀 Démarrage Rapide - Self-Hosting GB Dental

Guide ultra-rapide pour héberger GB Dental sur votre propre serveur.

## ⚡ Installation en 5 minutes

### Prérequis
- Un serveur Linux (Ubuntu 22.04 recommandé)
- 4GB RAM minimum
- Docker installé

### Étape 1 : Installation de Docker (si pas déjà installé)

```bash
# Installation automatique
curl -fsSL https://get.docker.com | sh

# Ajouter votre utilisateur au groupe docker
sudo usermod -aG docker $USER

# Redémarrer la session
newgrp docker
```

### Étape 2 : Cloner le projet

```bash
# Cloner votre repo ou copier les fichiers
git clone https://votre-repo/gb-dental.git
cd gb-dental
```

### Étape 3 : Configuration

```bash
# Copier le fichier d'environnement exemple
cp .env.example .env

# Générer des secrets sécurisés
POSTGRES_PASS=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# Mettre à jour le fichier .env
sed -i "s/changez-moi-valeur-tres-secrete-et-longue/$POSTGRES_PASS/g" .env
sed -i "s/changez-moi-autre-valeur-tres-secrete-et-longue/$JWT_SECRET/g" .env

# Éditer pour ajouter votre config SMTP (optionnel)
nano .env
```

### Étape 4 : Lancer l'application

```bash
# Utiliser le script automatique
./start-selfhosted.sh
```

**Ou manuellement :**

```bash
# Démarrer les services
docker compose up -d

# Attendre que PostgreSQL soit prêt
sleep 10

# Appliquer les migrations
for migration in supabase/migrations/*.sql; do
  docker compose exec -T postgres psql -U postgres -d postgres < "$migration"
done
```

### Étape 5 : Démarrer le frontend

```bash
# Dans un autre terminal
npm install
npm run dev
```

## ✅ C'est tout !

L'application est accessible à :
- **Frontend** : http://localhost:5173
- **API** : http://localhost:8000
- **Admin Panel** : http://localhost:3000

## 📊 Vérifier que tout fonctionne

```bash
# Voir l'état des services
docker compose ps

# Tous les services doivent être "Up" et "healthy"
```

## 🌐 Accès depuis Internet (Production)

### Option A : Avec Nginx (Recommandé)

```bash
# Installer Nginx
sudo apt install nginx certbot python3-certbot-nginx -y

# Créer la configuration
sudo nano /etc/nginx/sites-available/gb-dental
```

Coller cette configuration :

```nginx
# API
server {
    listen 80;
    server_name api.votre-domaine.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Frontend
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

```bash
# Activer la configuration
sudo ln -s /etc/nginx/sites-available/gb-dental /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Obtenir un certificat SSL gratuit
sudo certbot --nginx -d votre-domaine.com -d api.votre-domaine.com
```

### Option B : Avec Caddy (Plus simple)

```bash
# Installer Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Créer le Caddyfile
sudo nano /etc/caddy/Caddyfile
```

Coller cette configuration :

```
votre-domaine.com {
    reverse_proxy localhost:5173
}

api.votre-domaine.com {
    reverse_proxy localhost:8000
}
```

```bash
# Démarrer Caddy (SSL automatique !)
sudo systemctl restart caddy
```

## 🔐 Configuration DNS

Créez ces enregistrements DNS chez votre registrar :

```
Type    Nom                     Valeur
A       votre-domaine.com       VOTRE_IP_SERVEUR
A       api.votre-domaine.com   VOTRE_IP_SERVEUR
```

## 📝 Mettre à jour .env pour la production

```bash
nano .env
```

Modifier ces lignes :

```bash
SITE_URL=https://votre-domaine.com
SUPABASE_PUBLIC_URL=https://api.votre-domaine.com
GOTRUE_URI_ALLOW_LIST=https://votre-domaine.com

VITE_SUPABASE_URL=https://api.votre-domaine.com
```

Puis redémarrer :

```bash
docker compose restart
```

## 🛡️ Sécurité de base

```bash
# Installer et configurer le firewall
sudo apt install ufw -y
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Installer Fail2ban pour protéger SSH
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

## 💾 Backups automatiques

```bash
# Créer le script de backup
sudo nano /usr/local/bin/backup-gb-dental.sh
```

Coller :

```bash
#!/bin/bash
BACKUP_DIR="/backups/gb-dental"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker compose exec -T postgres pg_dump -U postgres postgres > $BACKUP_DIR/backup_$DATE.sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete

echo "Backup terminé : backup_$DATE.sql"
```

```bash
# Rendre exécutable
sudo chmod +x /usr/local/bin/backup-gb-dental.sh

# Ajouter une tâche cron (tous les jours à 2h)
sudo crontab -e

# Ajouter cette ligne :
0 2 * * * /usr/local/bin/backup-gb-dental.sh
```

## 🔧 Commandes utiles

```bash
# Voir les logs en temps réel
docker compose logs -f

# Voir les logs d'un service spécifique
docker compose logs -f postgres
docker compose logs -f auth

# Redémarrer un service
docker compose restart auth

# Arrêter tout
docker compose down

# Redémarrer tout
docker compose restart

# Voir l'utilisation des ressources
docker stats

# Nettoyer les images inutilisées
docker system prune -a
```

## 🆘 Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs
docker compose logs

# Vérifier que les ports ne sont pas utilisés
sudo netstat -tlnp | grep -E ':(3000|5432|8000)'

# Arrêter et redémarrer proprement
docker compose down
docker compose up -d
```

### Erreur "Cannot connect to database"

```bash
# Vérifier que PostgreSQL est démarré
docker compose ps postgres

# Se connecter manuellement pour tester
docker compose exec postgres psql -U postgres

# Recréer la base si nécessaire
docker compose down -v
docker compose up -d
```

### Les migrations ne s'appliquent pas

```bash
# Appliquer manuellement
cd supabase/migrations
for f in *.sql; do
  docker compose exec -T postgres psql -U postgres -d postgres < "$f"
  echo "Applied: $f"
done
```

## 📚 Documentation complète

Pour plus de détails, consultez :
- [SELF_HOSTING_GUIDE.md](./SELF_HOSTING_GUIDE.md) - Guide complet
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) - Documentation des Edge Functions
- [SIGNUP_FIX.md](./SIGNUP_FIX.md) - Détails sur le système d'inscription

## 💰 Coûts estimés

### Hébergement VPS
- **Petit** (< 100 users) : ~15€/mois
  - Hetzner CPX21 : 2 vCPU, 4GB RAM
  - OVH VPS Value

- **Moyen** (100-1000 users) : ~30€/mois
  - Hetzner CPX31 : 4 vCPU, 8GB RAM
  - OVH VPS Comfort

### Alternatives gratuites (dev/test)
- **Oracle Cloud Free Tier** : 4 vCPU, 24GB RAM (gratuit à vie)
- **Railway** : 5$/mois pour 8GB RAM
- **Render** : Plan gratuit disponible

## ✅ Checklist de production

- [ ] Secrets générés de manière sécurisée
- [ ] Certificat SSL configuré
- [ ] Firewall activé
- [ ] Backups automatiques configurés
- [ ] DNS configuré
- [ ] Monitoring en place (optionnel)
- [ ] SMTP configuré pour les emails
- [ ] Tests d'inscription/connexion validés

## 🎉 Support

Si vous rencontrez des problèmes :
1. Consultez les logs : `docker compose logs`
2. Vérifiez la configuration : `cat .env`
3. Consultez la documentation complète

Bon déploiement ! 🚀
