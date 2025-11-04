# DentalCloud Edge Functions

Ce dossier contient les Supabase Edge Functions pour DentalCloud.

## Functions disponibles

### 1. `send-email`
Envoie des emails via SMTP.

**Endpoint:** `POST /functions/v1/send-email`

**Payload:**
```json
{
  "to": "email@example.com",
  "subject": "Subject",
  "html": "<h1>Email content</h1>",
  "from": "optional@sender.com"
}
```

**Variables d'environnement requises:**
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SENDER_NAME`
- `SMTP_ADMIN_EMAIL`

### 2. `generate-invoice-pdf`
Génère un PDF de facture.

**Endpoint:** `POST /functions/v1/generate-invoice-pdf`

**Payload:**
```json
{
  "invoice_number": "INV-2024-001",
  "invoice_date": "2024-11-04",
  "dentist_name": "Dr. Martin",
  "items": [
    {
      "description": "Couronne céramique",
      "quantity": 2,
      "unit_price": 150.00,
      "total": 300.00
    }
  ],
  "subtotal": 300.00,
  "tax_rate": 20,
  "tax_amount": 60.00,
  "total": 360.00
}
```

### 3. `health-check`
Vérification de l'état des Edge Functions.

**Endpoint:** `GET /functions/v1/health-check`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-04T12:00:00Z",
  "service": "DentalCloud Edge Functions",
  "version": "1.0.0"
}
```

### 4. `stock-alerts`
Vérifie les produits avec stock faible.

**Endpoint:** `GET /functions/v1/stock-alerts`

**Response:**
```json
{
  "catalog_items": [...],
  "resource_variants": [...],
  "total_alerts": 5,
  "timestamp": "2024-11-04T12:00:00Z"
}
```

### 5. `backup-database`
Crée un backup de toutes les tables (admin uniquement).

**Endpoint:** `POST /functions/v1/backup-database`

**Headers:**
```
Authorization: Bearer YOUR_SERVICE_ROLE_KEY
```

## Déploiement

### Déploiement local (self-hosted)

Les Edge Functions sont automatiquement disponibles avec le docker-compose :

```bash
# Les functions sont chargées depuis le dossier supabase/functions/
docker compose up -d
```

### Test des functions

```bash
# Health check
curl https://api.dentalcloud.fr/functions/v1/health-check

# Send email (avec authentification)
curl -X POST https://api.dentalcloud.fr/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test",
    "html": "<h1>Test email</h1>"
  }'

# Stock alerts
curl -X GET https://api.dentalcloud.fr/functions/v1/stock-alerts \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Développement

Pour ajouter une nouvelle function :

1. Créer un nouveau dossier : `supabase/functions/ma-function/`
2. Créer `index.ts` dans ce dossier
3. Utiliser le template suivant :

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Votre logique ici

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

## Notes importantes

### CORS
Toutes les functions incluent les headers CORS nécessaires pour être appelées depuis le frontend.

### Authentification
Les functions utilisent l'authentification Supabase via le header `Authorization: Bearer TOKEN`.

### Variables d'environnement
Les variables d'environnement sont automatiquement injectées depuis le fichier `.env` du docker-compose.

### Logs
Les logs sont visibles via :
```bash
docker compose logs -f functions
```

## Production

Pour la production, considérez :

1. **Email** : Intégrer un vrai service SMTP (SendGrid, Mailgun, AWS SES)
2. **PDF** : Utiliser un service de génération PDF (Puppeteer, PDFKit)
3. **Backup** : Stocker les backups dans Supabase Storage ou S3
4. **Monitoring** : Ajouter des alertes et monitoring
5. **Rate limiting** : Ajouter une limitation de taux d'appels

## Sécurité

- ✅ Toutes les functions ont CORS configuré
- ✅ Authentification requise pour les endpoints sensibles
- ✅ Service role key uniquement pour les fonctions admin
- ✅ Validation des données d'entrée
- ✅ Gestion d'erreurs sécurisée
