# 🏥 GB Dental - Solution de Gestion pour Laboratoires Dentaires

Application complète de gestion pour laboratoires dentaires prothésistes, incluant la gestion des commandes, factures, stock, ressources et patients.

## 🚀 Options d'hébergement

### 1. Démarrage rapide (5 minutes)

**Sur votre machine locale ou serveur Linux :**

```bash
# Cloner le projet
git clone https://votre-repo/gb-dental.git
cd gb-dental

# Lancer l'installation automatique
./start-selfhosted.sh
```

📖 **[Guide de démarrage rapide →](./QUICKSTART_SELFHOSTING.md)**

### 2. Hébergement production complet

Documentation détaillée avec :
- Configuration serveur Linux
- Configuration SSL/HTTPS
- Backups automatiques
- Monitoring et sécurité

📖 **[Guide complet d'auto-hébergement →](./SELF_HOSTING_GUIDE.md)**

## 📋 Architecture

```
GB Dental Self-Hosted
├── PostgreSQL (Base de données)
├── Supabase Auth (Authentification)
├── Supabase Edge Functions (API serverless)
├── Kong API Gateway (Routage)
├── React Frontend (Interface utilisateur)
└── Nginx/Caddy (Reverse proxy - production)
```

## ✨ Fonctionnalités

### Gestion complète
- 📝 Bons de livraison
- 💰 Factures et avoirs
- 🦷 Catalogue de produits dentaires
- 👨‍⚕️ Gestion des dentistes
- 👤 Gestion des patients
- 📦 Gestion de stock avec variantes
- 📊 Tableau de bord analytique

### Système avancé
- 🔐 Authentification sécurisée
- 👥 Système multi-utilisateurs
- 🔑 Codes d'accès pour inscription
- 💳 Gestion des abonnements (Trial/Active)
- 📧 Notifications email
- 📄 Génération de PDF
- 🎨 Interface moderne et responsive

## 🔧 Prérequis

### Développement local
- Node.js 18+
- Docker & Docker Compose
- 4GB RAM minimum

### Production
- Serveur Linux (Ubuntu 22.04 recommandé)
- 4-8GB RAM
- 20GB stockage
- Nom de domaine (optionnel mais recommandé)

## 📦 Installation

### Option A : Script automatique (recommandé)

```bash
# 1. Configurer l'environnement
cp .env.example .env
nano .env  # Éditer la configuration

# 2. Lancer l'installation
./start-selfhosted.sh

# 3. Démarrer le frontend
npm install
npm run dev
```

### Option B : Manuel

```bash
# 1. Configuration
cp .env.example .env
# Éditer .env avec vos valeurs

# 2. Démarrer les services Docker
docker compose up -d

# 3. Appliquer les migrations
for f in supabase/migrations/*.sql; do
  docker compose exec -T postgres psql -U postgres -d postgres < "$f"
done

# 4. Démarrer le frontend
npm install
npm run dev
```

## 🌐 Accès

Après installation :

- **Frontend** : http://localhost:5173
- **API Supabase** : http://localhost:8000
- **Admin Panel** : http://localhost:3000
- **PostgreSQL** : localhost:5432

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [QUICKSTART_SELFHOSTING.md](./QUICKSTART_SELFHOSTING.md) | Démarrage rapide en 5 minutes |
| [SELF_HOSTING_GUIDE.md](./SELF_HOSTING_GUIDE.md) | Guide complet d'hébergement |
| [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) | Documentation des Edge Functions |
| [SIGNUP_FIX.md](./SIGNUP_FIX.md) | Détails sur le système d'inscription |

## 🔒 Sécurité

### Configuration par défaut
- ✅ RLS (Row Level Security) activé sur toutes les tables
- ✅ Authentification JWT sécurisée
- ✅ Politiques d'accès strictes
- ✅ Variables d'environnement pour les secrets

### Pour la production
- 🔐 Changer tous les secrets par défaut
- 🔒 Activer HTTPS avec certificat SSL
- 🛡️ Configurer le firewall
- 🚫 Limiter l'accès SSH
- 💾 Mettre en place des backups

## 🔑 Configuration Email (SMTP)

Pour activer les notifications email, configurez dans `.env` :

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-app-password
SMTP_SENDER_NAME=GB Dental
```

### Configuration Gmail
1. Activer la validation en 2 étapes
2. Créer un "App Password"
3. Utiliser ce mot de passe dans `SMTP_PASS`

## 📊 Edge Functions disponibles

| Fonction | Endpoint | Description |
|----------|----------|-------------|
| `generate-pdf` | `/functions/v1/generate-pdf` | Génération de PDFs (factures, bons) |
| `send-email` | `/functions/v1/send-email` | Envoi d'emails avec pièces jointes |
| `stock-webhook` | `/functions/v1/stock-webhook` | Alertes de stock faible |
| `invoice-notification` | `/functions/v1/invoice-notification` | Notification de nouvelles factures |

📖 **[Documentation complète des Edge Functions →](./EDGE_FUNCTIONS.md)**

## 💻 Commandes utiles

```bash
# Voir les logs
docker compose logs -f

# Redémarrer les services
docker compose restart

# Arrêter tout
docker compose down

# État des services
docker compose ps

# Backup de la base
docker compose exec postgres pg_dump -U postgres postgres > backup.sql

# Restaurer une backup
docker compose exec -T postgres psql -U postgres -d postgres < backup.sql

# Nettoyer les images Docker inutilisées
docker system prune -a
```

## 🏗️ Structure du projet

```
gb-dental/
├── supabase/
│   ├── functions/           # Edge Functions (serverless)
│   │   ├── generate-pdf/
│   │   ├── send-email/
│   │   ├── stock-webhook/
│   │   └── invoice-notification/
│   └── migrations/          # Migrations SQL
├── src/
│   ├── components/          # Composants React
│   ├── contexts/            # Contextes (Auth, etc.)
│   ├── lib/                 # Configuration (Supabase)
│   └── utils/               # Utilitaires
├── docker-compose.yml       # Configuration Docker
├── kong.yml                 # Configuration API Gateway
├── .env.example             # Template de configuration
└── start-selfhosted.sh      # Script de démarrage
```

## 🐛 Dépannage

### PostgreSQL ne démarre pas
```bash
docker compose logs postgres
docker compose down -v
docker compose up -d
```

### Les migrations échouent
```bash
# Appliquer manuellement une par une
for f in supabase/migrations/*.sql; do
  echo "Applying: $f"
  docker compose exec -T postgres psql -U postgres -d postgres < "$f" || echo "Failed: $f"
done
```

### Erreurs d'authentification
```bash
# Vérifier la configuration
docker compose logs auth

# Vérifier le JWT_SECRET dans .env
grep JWT_SECRET .env
```

### Port déjà utilisé
```bash
# Voir quel processus utilise le port
sudo netstat -tlnp | grep :8000

# Changer le port dans docker-compose.yml
```

## 💰 Coûts d'hébergement

### VPS Cloud
- **Petit** (< 100 utilisateurs) : 10-20€/mois
  - Hetzner CX21, OVH VPS Value

- **Moyen** (100-1000 utilisateurs) : 30-50€/mois
  - Hetzner CX31, OVH VPS Comfort

- **Grand** (> 1000 utilisateurs) : 100€+/mois
  - Serveur dédié ou VPS premium

### Alternatives gratuites (dev/test)
- Oracle Cloud Free Tier : 24GB RAM gratuits
- Railway : 5$/mois
- Render : Plan gratuit disponible

## 📈 Mise à l'échelle

Pour gérer plus d'utilisateurs :

1. **Augmenter les ressources**
   ```bash
   # Éditer docker-compose.yml
   services:
     postgres:
       deploy:
         resources:
           limits:
             cpus: '4'
             memory: 8G
   ```

2. **Ajouter un cache Redis**
3. **Utiliser un CDN** pour les assets statiques
4. **Séparer les services** sur plusieurs serveurs

## 🤝 Contribution

Pour contribuer au projet :
1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT - voir le fichier LICENSE pour plus de détails.

## 🆘 Support

- 📧 Email : support@votre-domaine.com
- �� Documentation : Voir les fichiers *.md du projet
- 🐛 Issues : Ouvrir une issue sur GitHub

## ✅ Checklist de production

Avant de mettre en production :

- [ ] Tous les secrets changés (POSTGRES_PASSWORD, JWT_SECRET)
- [ ] SMTP configuré et testé
- [ ] SSL/HTTPS configuré
- [ ] Firewall activé (ports 22, 80, 443)
- [ ] Backups automatiques configurés
- [ ] DNS configuré
- [ ] Tests d'inscription/connexion validés
- [ ] Monitoring mis en place (optionnel)
- [ ] Documentation lue et comprise

---

**Fait avec ❤️ pour les laboratoires dentaires**
