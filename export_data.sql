-- Script pour exporter toutes les données de la base de données
-- Exécutez ce script dans votre Supabase actuelle pour obtenir un dump des données

-- Export des profils utilisateurs
COPY (SELECT * FROM profiles) TO STDOUT WITH CSV HEADER;

-- Export des profils utilisateurs détaillés
COPY (SELECT * FROM user_profiles) TO STDOUT WITH CSV HEADER;

-- Export des dentistes
COPY (SELECT * FROM dentist_accounts) TO STDOUT WITH CSV HEADER;

-- Export des patients
COPY (SELECT * FROM patients) TO STDOUT WITH CSV HEADER;

-- Export du catalogue
COPY (SELECT * FROM catalog) TO STDOUT WITH CSV HEADER;

-- Export des ressources
COPY (SELECT * FROM resources) TO STDOUT WITH CSV HEADER;

-- Export des variantes de ressources
COPY (SELECT * FROM resource_variants) TO STDOUT WITH CSV HEADER;

-- Export des bons de livraison
COPY (SELECT * FROM delivery_notes) TO STDOUT WITH CSV HEADER;

-- Export des items de bons de livraison
COPY (SELECT * FROM delivery_note_items) TO STDOUT WITH CSV HEADER;

-- Export des proformas
COPY (SELECT * FROM proformas) TO STDOUT WITH CSV HEADER;

-- Export des items de proformas
COPY (SELECT * FROM proforma_items) TO STDOUT WITH CSV HEADER;

-- Export des factures
COPY (SELECT * FROM invoices) TO STDOUT WITH CSV HEADER;

-- Export des items de factures
COPY (SELECT * FROM invoice_items) TO STDOUT WITH CSV HEADER;

-- Export des notes de crédit
COPY (SELECT * FROM credit_notes) TO STDOUT WITH CSV HEADER;

-- Export des items de notes de crédit
COPY (SELECT * FROM credit_note_items) TO STDOUT WITH CSV HEADER;

-- Export des mouvements de stock
COPY (SELECT * FROM stock_movements) TO STDOUT WITH CSV HEADER;

-- Export des codes d'accès
COPY (SELECT * FROM access_codes) TO STDOUT WITH CSV HEADER;

-- Export des plans d'abonnement
COPY (SELECT * FROM subscription_plans) TO STDOUT WITH CSV HEADER;

-- Export des abonnements
COPY (SELECT * FROM subscriptions) TO STDOUT WITH CSV HEADER;

-- Export des paramètres SMTP
COPY (SELECT * FROM smtp_settings) TO STDOUT WITH CSV HEADER;

-- Export des tickets de support
COPY (SELECT * FROM support_tickets) TO STDOUT WITH CSV HEADER;

-- Export des messages de support
COPY (SELECT * FROM support_messages) TO STDOUT WITH CSV HEADER;

-- Export des articles d'aide
COPY (SELECT * FROM help_articles) TO STDOUT WITH CSV HEADER;

-- Export des soumissions de photos
COPY (SELECT * FROM photo_submissions) TO STDOUT WITH CSV HEADER;

-- Export des laboratoires favoris
COPY (SELECT * FROM dentist_favorite_laboratories) TO STDOUT WITH CSV HEADER;

-- Export des employés
COPY (SELECT * FROM employees) TO STDOUT WITH CSV HEADER;

-- Export des logs d'audit
COPY (SELECT * FROM audit_logs) TO STDOUT WITH CSV HEADER;
