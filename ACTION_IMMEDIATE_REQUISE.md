# 🚨 ACTION IMMÉDIATE REQUISE

## Problème actuel

Votre application sur **https://dentalcloud.fr** affiche:
```
https://r2.dscore.com/secureLogin?client_id=&code_challenge=...&redirect_uri=https://dentalcloud.fr
```

❌ **Le `client_id` est vide** → Erreur 404 Page Not Found

## Cause

L'image Docker actuellement déployée sur votre serveur a été construite **sans les variables d'environnement DS-Core**.

## Solution (3 étapes simples)

### Étape 1: Se connecter au serveur

```bash
ssh votre-user@dentalcloud.fr
```

### Étape 2: Aller dans le répertoire du projet

```bash
cd /chemin/vers/votre/projet
```

### Étape 3: Lancer le script de déploiement

```bash
./deploy-production.sh
```

Le script va:
1. ✅ Charger les variables depuis `.env`
2. ✅ Arrêter l'ancien conteneur
3. ✅ Supprimer l'ancienne image
4. ✅ Reconstruire l'image avec les bonnes variables
5. ✅ Lancer le nouveau conteneur

**Durée**: ~5 minutes

## Vérification

Après le déploiement:

1. Allez sur https://dentalcloud.fr
2. Ouvrez la Console (F12)
3. Rechargez la page
4. Cherchez "DS-Core Configuration" dans les logs
5. Vérifiez que `clientId: "8e956fa7..."` (pas "NOT SET")

Testez la connexion DS-Core:
- Paramètres → Intégrations → Connexion DS-Core
- L'URL devrait maintenant contenir `client_id=8e956fa7-c675-42fc-afe0-01fc58ddeb0b`

## Important: Redirect URL DS-Core

⚠️ Vous DEVEZ aussi configurer le Redirect URL dans DS-Core:

1. Allez sur https://open.dscore.com
2. Connectez-vous
3. My Apps → Votre application
4. Ajoutez: `https://dentalcloud.fr/settings`
5. Sauvegardez

**Sans cette configuration, vous aurez toujours une erreur 404!**

## Alternative manuelle

Si le script ne fonctionne pas:

```bash
# 1. Arrêter et supprimer l'ancien conteneur
docker stop gb-dental && docker rm gb-dental

# 2. Supprimer l'ancienne image
docker rmi gb-dental:latest

# 3. Reconstruire avec le script
./docker-build.sh

# 4. Relancer
docker run -d -p 3000:3000 --name gb-dental --restart unless-stopped gb-dental:latest
```

## Fichiers créés pour vous

- ✅ `deploy-production.sh` - Script de déploiement automatisé
- ✅ `docker-build.sh` - Script de build Docker
- ✅ `docker-compose.yml` - Configuration Docker Compose
- ✅ `FIX_CLIENT_ID_VIDE.md` - Guide de dépannage détaillé
- ✅ `.env` - Mis à jour avec `VITE_DSCORE_CALLBACK_URL=https://dentalcloud.fr/settings`

## Résumé technique

**Pourquoi ça ne marche pas?**

Les variables `VITE_*` sont intégrées au moment du **build**, pas au runtime.

Si vous déployez une image Docker construite avant les modifications du `.env`, elle ne contiendra pas les bonnes valeurs.

**Solution**: Reconstruire l'image Docker → Les variables seront intégrées dans les fichiers JavaScript compilés.

## Commandes de monitoring

```bash
# Voir les logs en temps réel
docker logs -f gb-dental

# Vérifier que le conteneur tourne
docker ps | grep gb-dental

# Redémarrer le conteneur
docker restart gb-dental
```

## Besoin d'aide?

1. Lisez `FIX_CLIENT_ID_VIDE.md` pour un guide détaillé
2. Lisez `INSTRUCTIONS_DEPLOIEMENT_DOCKER.md` pour la doc complète
3. Vérifiez les logs: `docker logs gb-dental`

## Checklist rapide

- [ ] Connexion SSH au serveur
- [ ] Exécution de `./deploy-production.sh`
- [ ] Conteneur redémarré avec succès
- [ ] Console navigateur montre client_id valide
- [ ] Redirect URL configuré dans DS-Core Portal
- [ ] Test de connexion DS-Core réussi

**Temps estimé total**: 10 minutes

Bonne chance! 🚀
