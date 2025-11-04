# Guide d'Installation VPS - GB Dental

Installation complète et automatique de GB Dental sur un VPS avec Supabase Cloud.

## Prérequis

1. **Un VPS** (Ubuntu 20.04/22.04 ou Debian 11/12)
   - Minimum : 1 CPU, 1 GB RAM
   - Recommandé : 2 CPU, 2 GB RAM

2. **Un nom de domaine** pointant vers votre VPS
   - Configurez un enregistrement A : `votre-domaine.com` → IP du VPS

3. **Un compte Supabase Cloud** avec votre projet configuré
   - URL : `https://xxxxx.supabase.co`
   - ANON_KEY et SERVICE_ROLE_KEY disponibles

## Installation Rapide

### Étape 1 : Sur votre VPS

```bash
# Connectez-vous en SSH
ssh root@votre-ip

# Téléchargez le script
wget https://votre-repo/install-vps-simple.sh
# OU copiez-le depuis votre machine locale
scp install-vps-simple.sh root@votre-ip:/root/

# Rendez-le exécutable et lancez-le
chmod +x install-vps-simple.sh
sudo ./install-vps-simple.sh
```

Le script vous demandera :
- Votre nom de domaine
- Votre URL Supabase
- Vos clés Supabase (ANON_KEY et SERVICE_ROLE_KEY)

### Étape 2 : Appliquer les migrations Supabase

**IMPORTANT** : Avant de déployer l'application, appliquez les migrations à votre base Supabase Cloud.

1. Allez sur votre dashboard Supabase : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Copiez et exécutez **chaque fichier** du dossier `supabase/migrations/` dans l'ordre chronologique :

```
00000000000000_init_supabase.sql
20251029132912_create_gb_dental_schema.sql
20251029135224_add_delivery_note_fields.sql
... (tous les fichiers dans l'ordre)
20251104165627_fix_duplicate_triggers_signup.sql (LA PLUS IMPORTANTE pour l'auth)
```

5. Vérifiez qu'il n'y a pas d'erreurs

### Étape 3 : Déployer l'application

```bash
# Sur votre machine locale, envoyez les fichiers
cd /chemin/vers/gb-dental
scp -r * root@votre-domaine.com:/opt/gb-dental/

# Sur le VPS, déployez
ssh root@votre-domaine.com
cd /opt/gb-dental
./deploy.sh
```

Votre application sera accessible sur `https://votre-domaine.com` !

## Configuration Supabase Dashboard

### Désactiver la confirmation d'email

Pour permettre l'inscription directe :

1. Dashboard Supabase → **Authentication** → **Settings**
2. Décochez **"Enable email confirmations"**
3. Sauvegardez

### Vérifier les tables

Dans **Table Editor**, vérifiez que ces tables existent :
- `profiles`
- `user_profiles`
- `dentists`
- `patients`
- `catalog_items`
- `delivery_notes`
- `proformas`
- `invoices`
- Et toutes les autres...

### Tester l'authentification

1. Allez sur `https://votre-domaine.com`
2. Cliquez sur **"Créer un compte"**
3. Remplissez le formulaire
4. Si ça fonctionne → ✅ Tout est OK !
5. Si erreur 500 → Vérifiez les logs dans **Logs** → **Postgres Logs**

## Commandes Utiles

### Sur le VPS

```bash
# Déployer après un changement
cd /opt/gb-dental
./deploy.sh

# Mettre à jour depuis Git
./update.sh

# Voir les logs en temps réel
./logs.sh

# Vérifier Nginx
nginx -t
systemctl status nginx

# Redémarrer Nginx
systemctl restart nginx

# Voir les logs système
journalctl -u gb-dental -f
```

### Configuration

```bash
# Fichier de configuration
nano /opt/gb-dental/.env

# Configuration Nginx
nano /etc/nginx/sites-available/gb-dental

# Après modification de Nginx
nginx -t
systemctl reload nginx
```

## Résolution des Problèmes

### Erreur 500 lors de l'inscription

**Cause** : Migration de fixation des triggers non appliquée.

**Solution** :
```sql
-- Dans le SQL Editor de Supabase, exécutez :
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
DROP FUNCTION IF EXISTS create_user_profile_on_profile_insert();
```

Puis réappliquez la migration `20251104165627_fix_duplicate_triggers_signup.sql`.

### SSL ne fonctionne pas

**Cause** : DNS non propagé ou domaine invalide.

**Solution** :
```bash
# Vérifiez le DNS
dig votre-domaine.com

# Réessayez SSL manuellement
certbot --nginx -d votre-domaine.com
```

### L'application ne se charge pas

**Vérifications** :
```bash
# Vérifiez que Nginx tourne
systemctl status nginx

# Vérifiez les logs
tail -f /var/log/nginx/error.log

# Vérifiez que le build existe
ls -la /opt/gb-dental/dist/

# Refaites un build
cd /opt/gb-dental
npm run build
systemctl reload nginx
```

### Erreur de connexion à Supabase

**Vérifications** :
1. Le `.env` contient les bonnes clés
2. L'URL Supabase est correcte (avec `https://`)
3. La clé ANON_KEY est bien la clé "anon/public"
4. Dans le dashboard Supabase, vérifiez que le projet est actif

```bash
# Vérifiez le .env
cat /opt/gb-dental/.env

# Testez la connexion
curl https://votre-projet.supabase.co/rest/v1/
```

## Mise à Jour de l'Application

### Depuis votre machine locale

```bash
# Envoyez les nouveaux fichiers
scp -r * root@votre-domaine.com:/opt/gb-dental/

# Sur le VPS
ssh root@votre-domaine.com
cd /opt/gb-dental
./deploy.sh
```

### Depuis Git

```bash
# Sur le VPS
ssh root@votre-domaine.com
cd /opt/gb-dental

# Première fois : cloner le repo
git clone https://github.com/votre-username/gb-dental.git .

# Mises à jour suivantes
./update.sh
```

## Sécurité

### Protéger le .env

```bash
chmod 600 /opt/gb-dental/.env
chown root:root /opt/gb-dental/.env
```

### Firewall

Le script configure automatiquement UFW :
- Port 22 (SSH) : Ouvert
- Port 80 (HTTP) : Ouvert
- Port 443 (HTTPS) : Ouvert
- Tout le reste : Fermé

### Sauvegardes

Configurez des sauvegardes automatiques de Supabase :
1. Dashboard Supabase → **Settings** → **Backups**
2. Activez les sauvegardes quotidiennes

## Support

En cas de problème :

1. **Vérifiez les logs** : `./logs.sh` ou `journalctl -u gb-dental -f`
2. **Vérifiez Nginx** : `nginx -t` et `systemctl status nginx`
3. **Vérifiez Supabase** : Dashboard → Logs → Postgres Logs
4. **Testez le build** : `cd /opt/gb-dental && npm run build`

## Architecture Finale

```
Internet
   ↓
[Domaine] → [Cloudflare DNS ou autre]
   ↓
[VPS]
   ↓
[Nginx] (Port 80/443, SSL)
   ↓
[Application React] (/opt/gb-dental/dist)
   ↓
[Supabase Cloud] (Base de données + Auth)
```

## Checklist Complète

- [ ] VPS configuré avec Ubuntu/Debian
- [ ] Nom de domaine pointant vers le VPS (A record)
- [ ] Compte Supabase Cloud créé
- [ ] Script `install-vps-simple.sh` exécuté
- [ ] Toutes les migrations appliquées sur Supabase
- [ ] Confirmation d'email désactivée sur Supabase
- [ ] Fichiers de l'application copiés sur le VPS
- [ ] `deploy.sh` exécuté avec succès
- [ ] Application accessible sur https://votre-domaine.com
- [ ] Test de création de compte réussi
- [ ] Test de connexion réussi

🎉 **Installation terminée !**
