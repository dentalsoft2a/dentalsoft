# Guide de Déploiement - DentalCloud

## Prérequis

- VPS Ubuntu 20.04 ou supérieur
- Accès root SSH au serveur (185.172.57.253)
- Nom de domaine dentalcloud.fr configuré

## Configuration DNS (À faire AVANT le déploiement)

Ajoutez les enregistrements DNS suivants chez votre registrar:

```
Type    Nom                  Valeur
A       dentalcloud.fr       185.172.57.253
A       www.dentalcloud.fr   185.172.57.253
A       api.dentalcloud.fr   185.172.57.253
```

Attendez que la propagation DNS soit terminée (vérifiez avec `nslookup dentalcloud.fr`)

## Installation

### 1. Connexion au serveur

```bash
ssh root@185.172.57.253
```

### 2. Transfert des fichiers

Depuis votre machine locale, transférez le projet:

```bash
# Compressez le projet
tar -czf dentalcloud.tar.gz --exclude=node_modules --exclude=dist .

# Transférez vers le serveur
scp dentalcloud.tar.gz root@185.172.57.253:/tmp/

# Sur le serveur, décompressez
ssh root@185.172.57.253
cd /tmp
tar -xzf dentalcloud.tar.gz -C ~/dentalcloud-deploy
cd ~/dentalcloud-deploy
```

### 3. Exécution du script de déploiement

```bash
chmod +x deploy.sh
./deploy.sh
```

Le script va automatiquement:
- ✅ Installer Node.js, Nginx, PostgreSQL
- ✅ Configurer le pare-feu
- ✅ Builder l'application React
- ✅ Configurer Nginx avec SSL/HTTPS
- ✅ Installer et configurer PostgreSQL
- ✅ Créer la base de données
- ✅ Installer PostgREST pour l'API REST
- ✅ Configurer les sauvegardes automatiques

### 4. Migration de la base de données

```bash
chmod +x migrate-database.sh
./migrate-database.sh
```

## Vérifications Post-Déploiement

### Vérifier les services

```bash
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status postgrest
```

### Tester l'application

```bash
curl https://dentalcloud.fr
```

### Vérifier les logs

```bash
# Logs Nginx
sudo tail -f /var/log/nginx/error.log

# Logs PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*-main.log

# Logs PostgREST
sudo journalctl -u postgrest -f
```

## Maintenance

### Mise à jour de l'application

```bash
cd /var/www/dentalcloud
git pull  # Si vous utilisez Git
npm install
npm run build
sudo systemctl reload nginx
```

### Sauvegarde manuelle

```bash
sudo /usr/local/bin/backup-dentalcloud.sh
```

### Restauration d'une sauvegarde

```bash
gunzip < /var/backups/dentalcloud/dentalcloud_YYYYMMDD_HHMMSS.sql.gz | sudo -u postgres psql dentalcloud
```

### Accès à la base de données

```bash
sudo -u postgres psql dentalcloud
```

## Sécurité

### Changer le mot de passe PostgreSQL

```bash
sudo -u postgres psql
ALTER USER dentalcloud_user WITH PASSWORD 'nouveau_mot_de_passe';
\q

# Mettre à jour la configuration
sudo nano /etc/postgrest/config
sudo systemctl restart postgrest
```

### Configurer un pare-feu additionnel

```bash
sudo ufw status
sudo ufw allow from VOTRE_IP to any port 5432  # Limiter l'accès PostgreSQL
```

## Dépannage

### L'application ne se charge pas

```bash
# Vérifier Nginx
sudo nginx -t
sudo systemctl restart nginx

# Vérifier les permissions
sudo chown -R www-data:www-data /var/www/dentalcloud/dist
```

### Erreurs de base de données

```bash
# Redémarrer PostgreSQL
sudo systemctl restart postgresql

# Vérifier les connexions
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

### Certificat SSL expiré

```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

## Monitoring

### Installer un outil de monitoring (optionnel)

```bash
# Netdata pour le monitoring système
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

Accessible sur: http://185.172.57.253:19999

## Support

Pour toute question ou problème, consultez les logs:

```bash
# Logs système
sudo journalctl -xe

# Logs de tous les services
sudo journalctl -u nginx -u postgresql -u postgrest --since today
```

## URLs Importantes

- Application: https://dentalcloud.fr
- API: http://api.dentalcloud.fr
- Sauvegardes: /var/backups/dentalcloud
- Logs: /var/log/nginx/
