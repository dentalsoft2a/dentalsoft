-- Script pour exporter toutes les données de la base de données
-- Exécutez ce script dans votre Supabase actuelle pour obtenir un dump des données
-- Ce script a été mis à jour pour correspondre aux tables qui existent réellement

-- Export des profils utilisateurs
COPY (SELECT * FROM profiles) TO STDOUT WITH CSV HEADER;

-- Export des profils utilisateurs détaillés
COPY (SELECT * FROM user_profiles) TO STDOUT WITH CSV HEADER;

-- Export des dentistes
COPY (SELECT * FROM dentist_accounts) TO STDOUT WITH CSV HEADER;

-- Export de la table dentists (ancienne table)
COPY (SELECT * FROM dentists) TO STDOUT WITH CSV HEADER;

-- Export des patients
COPY (SELECT * FROM patients) TO STDOUT WITH CSV HEADER;

-- Export des items du catalogue
COPY (SELECT * FROM catalog_items) TO STDOUT WITH CSV HEADER;

-- Export des ressources liées aux items du catalogue
COPY (SELECT * FROM catalog_item_resources) TO STDOUT WITH CSV HEADER;

-- Export des ressources
COPY (SELECT * FROM resources) TO STDOUT WITH CSV HEADER;

-- Export des variantes de ressources
COPY (SELECT * FROM resource_variants) TO STDOUT WITH CSV HEADER;

-- Export des bons de livraison
COPY (SELECT * FROM delivery_notes) TO STDOUT WITH CSV HEADER;

-- Export des proformas
COPY (SELECT * FROM proformas) TO STDOUT WITH CSV HEADER;

-- Export des items de proformas
COPY (SELECT * FROM proforma_items) TO STDOUT WITH CSV HEADER;

-- Export des factures
COPY (SELECT * FROM invoices) TO STDOUT WITH CSV HEADER;

-- Export des liens factures-proformas
COPY (SELECT * FROM invoice_proformas) TO STDOUT WITH CSV HEADER;

-- Export des paiements de factures
COPY (SELECT * FROM invoice_payments) TO STDOUT WITH CSV HEADER;

-- Export des notes de crédit
COPY (SELECT * FROM credit_notes) TO STDOUT WITH CSV HEADER;

-- Export des items de notes de crédit
COPY (SELECT * FROM credit_note_items) TO STDOUT WITH CSV HEADER;

-- Export des mouvements de stock
COPY (SELECT * FROM stock_movements) TO STDOUT WITH CSV HEADER;

-- Export des codes d'accès
COPY (SELECT * FROM access_codes) TO STDOUT WITH CSV HEADER;

-- Export de l'utilisation des codes d'accès
COPY (SELECT * FROM access_code_usage) TO STDOUT WITH CSV HEADER;

-- Export des plans d'abonnement
COPY (SELECT * FROM subscription_plans) TO STDOUT WITH CSV HEADER;

-- Export des paramètres SMTP
COPY (SELECT * FROM smtp_settings) TO STDOUT WITH CSV HEADER;

-- Export des tickets de support
COPY (SELECT * FROM support_tickets) TO STDOUT WITH CSV HEADER;

-- Export des messages de support
COPY (SELECT * FROM support_messages) TO STDOUT WITH CSV HEADER;

-- Export des sujets d'aide
COPY (SELECT * FROM help_topics) TO STDOUT WITH CSV HEADER;

-- Export des réponses d'aide
COPY (SELECT * FROM help_replies) TO STDOUT WITH CSV HEADER;

-- Export des votes d'aide
COPY (SELECT * FROM help_votes) TO STDOUT WITH CSV HEADER;

-- Export des soumissions de photos
COPY (SELECT * FROM photo_submissions) TO STDOUT WITH CSV HEADER;

-- Export des laboratoires favoris
COPY (SELECT * FROM dentist_favorite_laboratories) TO STDOUT WITH CSV HEADER;

-- Export des employés de laboratoire
COPY (SELECT * FROM laboratory_employees) TO STDOUT WITH CSV HEADER;

-- Export des permissions des rôles de laboratoire
COPY (SELECT * FROM laboratory_role_permissions) TO STDOUT WITH CSV HEADER;

-- Export des logs d'audit admin
COPY (SELECT * FROM admin_audit_log) TO STDOUT WITH CSV HEADER;
