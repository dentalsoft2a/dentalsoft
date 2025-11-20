/*
  # Optimisation de la Gestion des Travaux - Partie 1: Nettoyage et Préparation

  1. Objectif
    - Nettoyer les enregistrements vides dans delivery_note_stages
    - Préparer la migration vers les étapes standard
    - Supprimer temporairement les politiques qui dépendent de current_stage_id

  2. Actions
    - Afficher les statistiques
    - Supprimer les enregistrements vides
    - Supprimer les politiques RLS temporairement
    
  3. Sécurité
    - Préservation des données réelles
    - Les politiques seront recréées dans la partie 2
*/

-- Statistiques avant nettoyage
DO $$
DECLARE
  total_records INTEGER;
  empty_records INTEGER;
  records_with_data INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_records FROM delivery_note_stages;

  SELECT COUNT(*) INTO empty_records
  FROM delivery_note_stages
  WHERE is_completed = false
    AND (notes IS NULL OR notes = '')
    AND (time_spent_minutes IS NULL OR time_spent_minutes = 0);

  records_with_data := total_records - empty_records;

  RAISE NOTICE '=== STATISTIQUES AVANT NETTOYAGE ===';
  RAISE NOTICE 'Total enregistrements: %', total_records;
  RAISE NOTICE 'Enregistrements vides: % (%.2f%%)', empty_records, (empty_records::float / NULLIF(total_records, 0) * 100);
  RAISE NOTICE 'Enregistrements avec données: % (%.2f%%)', records_with_data, (records_with_data::float / NULLIF(total_records, 0) * 100);
END $$;

-- Supprimer tous les enregistrements vides
DELETE FROM delivery_note_stages
WHERE is_completed = false
  AND (notes IS NULL OR notes = '')
  AND (time_spent_minutes IS NULL OR time_spent_minutes = 0);

-- Statistiques après nettoyage
DO $$
DECLARE
  total_records INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_records FROM delivery_note_stages;

  RAISE NOTICE '=== STATISTIQUES APRÈS NETTOYAGE ===';
  RAISE NOTICE 'Total enregistrements restants: %', total_records;
  RAISE NOTICE 'Nettoyage terminé avec succès!';
END $$;

-- Supprimer les politiques qui dépendent de current_stage_id pour permettre la modification du type
DROP POLICY IF EXISTS "Employees can view delivery notes at allowed stages" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can update delivery notes at allowed stages" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can view stages at allowed stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Employees can update stages at allowed stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Employees can insert stages at allowed stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Employees can delete stages at allowed stages" ON delivery_note_stages;

-- Log final
DO $$
BEGIN
  RAISE NOTICE 'Politiques RLS temporairement supprimées - elles seront recréées dans la prochaine migration';
END $$;
