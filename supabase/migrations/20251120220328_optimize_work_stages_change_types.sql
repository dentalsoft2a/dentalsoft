/*
  # Optimisation - Changement des Types de Colonnes

  1. Objectif
    - Changer current_stage_id de UUID vers TEXT
    - Changer stage_id dans delivery_note_stages de UUID vers TEXT
    - Migrer les données existantes vers les nouveaux IDs

  2. Sécurité
    - Transaction sécurisée
    - Mapping intelligent basé sur les noms d'étapes
*/

-- Statistiques avant migration
DO $$
DECLARE
  total_notes INTEGER;
  notes_with_stage INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_notes FROM delivery_notes;
  SELECT COUNT(*) INTO notes_with_stage FROM delivery_notes WHERE current_stage_id IS NOT NULL;

  RAISE NOTICE '=== AVANT MIGRATION DES TYPES ===';
  RAISE NOTICE 'Total bons: % | Bons avec étape: %', total_notes, notes_with_stage;
END $$;

-- Supprimer les contraintes de clé étrangère
ALTER TABLE delivery_notes DROP CONSTRAINT IF EXISTS delivery_notes_current_stage_id_fkey;
ALTER TABLE delivery_note_stages DROP CONSTRAINT IF EXISTS delivery_note_stages_stage_id_fkey;

-- Changer le type de current_stage_id en TEXT
ALTER TABLE delivery_notes ALTER COLUMN current_stage_id TYPE TEXT USING current_stage_id::TEXT;

-- Changer le type de stage_id dans delivery_note_stages en TEXT
ALTER TABLE delivery_note_stages ALTER COLUMN stage_id TYPE TEXT USING stage_id::TEXT;

-- Créer une table temporaire pour le mapping
CREATE TEMP TABLE stage_mapping AS
SELECT 
  id::TEXT as old_id,
  LOWER(REGEXP_REPLACE(name, '[éèêë]', 'e', 'g')) as normalized_name,
  name as original_name
FROM production_stages;

-- Mettre à jour delivery_notes
UPDATE delivery_notes dn
SET current_stage_id = CASE 
  WHEN sm.normalized_name LIKE '%reception%' THEN 'stage-reception'
  WHEN sm.normalized_name LIKE '%modelisation%' OR sm.normalized_name LIKE '%modelization%' THEN 'stage-modelisation'
  WHEN sm.normalized_name LIKE '%production%' AND sm.normalized_name NOT LIKE '%pre%' THEN 'stage-production'
  WHEN sm.normalized_name LIKE '%finition%' THEN 'stage-finition'
  WHEN sm.normalized_name LIKE '%controle%' OR sm.normalized_name LIKE '%qualite%' THEN 'stage-controle'
  WHEN sm.normalized_name LIKE '%pret%' OR sm.normalized_name LIKE '%livr%' THEN 'stage-pret'
  ELSE 'stage-reception'
END
FROM stage_mapping sm
WHERE dn.current_stage_id = sm.old_id;

-- Mettre à jour delivery_note_stages
UPDATE delivery_note_stages dns
SET stage_id = CASE 
  WHEN sm.normalized_name LIKE '%reception%' THEN 'stage-reception'
  WHEN sm.normalized_name LIKE '%modelisation%' OR sm.normalized_name LIKE '%modelization%' THEN 'stage-modelisation'
  WHEN sm.normalized_name LIKE '%production%' AND sm.normalized_name NOT LIKE '%pre%' THEN 'stage-production'
  WHEN sm.normalized_name LIKE '%finition%' THEN 'stage-finition'
  WHEN sm.normalized_name LIKE '%controle%' OR sm.normalized_name LIKE '%qualite%' THEN 'stage-controle'
  WHEN sm.normalized_name LIKE '%pret%' OR sm.normalized_name LIKE '%livr%' THEN 'stage-pret'
  ELSE 'stage-reception'
END
FROM stage_mapping sm
WHERE dns.stage_id = sm.old_id;

-- Statistiques après migration
DO $$
DECLARE
  stage_rec RECORD;
BEGIN
  RAISE NOTICE '=== DISTRIBUTION PAR ÉTAPE ===';
  FOR stage_rec IN 
    SELECT current_stage_id, COUNT(*) as count
    FROM delivery_notes
    WHERE current_stage_id IS NOT NULL
    GROUP BY current_stage_id
    ORDER BY current_stage_id
  LOOP
    RAISE NOTICE '% : %', stage_rec.current_stage_id, stage_rec.count;
  END LOOP;
  
  RAISE NOTICE 'Migration des types terminée avec succès!';
END $$;
