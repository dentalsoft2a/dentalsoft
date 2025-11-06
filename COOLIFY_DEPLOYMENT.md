# Déploiement sur Coolify

## Configuration requise

### Variables d'environnement (Build Args)

Dans Coolify, vous devez configurer ces variables en tant que **Build Arguments** :

1. Allez dans votre application Coolify
2. Settings → Environment Variables
3. Ajoutez ces variables en tant que **Build Arguments** :

```
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_anon_key
```

### Port

L'application écoute sur le port **80** (configuré dans Nginx).

## Étapes de déploiement

1. **Pushez le code** vers votre repository Git
2. **Configurez les Build Arguments** dans Coolify avec vos identifiants Supabase
3. **Déployez** l'application
4. **Vérifiez les logs** si vous avez des erreurs

## Résolution des problèmes

### Bad Gateway
- Vérifiez que les variables d'environnement sont bien configurées en tant que Build Arguments
- Vérifiez les logs de build pour voir si la compilation a réussi
- Assurez-vous que le port 80 est bien exposé dans Coolify

### Build échoue
- Vérifiez que toutes les dépendances dans package.json sont présentes
- Vérifiez que les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définies

### Variables d'environnement non disponibles
- Les variables VITE_* doivent être définies au moment du BUILD, pas au runtime
- Utilisez les Build Arguments dans Coolify, pas les Environment Variables runtime

## Notes importantes

- Cette application est une SPA (Single Page Application) React
- Nginx est utilisé pour servir les fichiers statiques
- Toutes les routes sont redirigées vers index.html pour le routing côté client
- Les variables d'environnement Vite sont compilées dans le bundle au moment du build
