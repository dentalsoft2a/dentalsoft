/*
  # Optimisation - Trigger et Index

  1. Objectif
    - Créer une fonction pour calculer la progression automatiquement
    - Ajouter un trigger pour mettre à jour progress_percentage
    - Ajouter des index pour optimiser les performances
    - Recalculer la progression de tous les bons existants

  2. Sécurité
    - Calcul automatique et fiable
    - Performance optimisée
*/

-- Fonction pour calculer la progression basée sur l'étape actuelle
CREATE OR REPLACE FUNCTION calculate_progress_from_stage(stage_id_param TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Si pas d'étape, retourner 0%
  IF stage_id_param IS NULL THEN
    RETURN 0;
  END IF;

  -- Mapper les IDs d'étapes à leur progression
  -- La progression représente le pourcentage AVANT d'arriver à cette étape
  RETURN CASE stage_id_param
    WHEN 'stage-reception' THEN 0      -- 0/6 = 0%
    WHEN 'stage-modelisation' THEN 17  -- 1/6 = 16.67% ≈ 17%
    WHEN 'stage-production' THEN 33    -- 2/6 = 33.33% ≈ 33%
    WHEN 'stage-finition' THEN 50      -- 3/6 = 50%
    WHEN 'stage-controle' THEN 67      -- 4/6 = 66.67% ≈ 67%
    WHEN 'stage-pret' THEN 83          -- 5/6 = 83.33% ≈ 83%
    ELSE 0
  END;
END;
$$;

-- Trigger pour mettre à jour automatiquement progress_percentage
CREATE OR REPLACE FUNCTION update_delivery_note_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Calculer et mettre à jour la progression quand current_stage_id change
  IF (TG_OP = 'UPDATE' AND OLD.current_stage_id IS DISTINCT FROM NEW.current_stage_id) OR 
     (TG_OP = 'INSERT' AND NEW.current_stage_id IS NOT NULL) THEN
    NEW.progress_percentage := calculate_progress_from_stage(NEW.current_stage_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_update_delivery_note_progress ON delivery_notes;

-- Créer le trigger sur delivery_notes
CREATE TRIGGER trigger_update_delivery_note_progress
  BEFORE INSERT OR UPDATE OF current_stage_id
  ON delivery_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_note_progress();

-- Recalculer la progression pour tous les bons de livraison existants
UPDATE delivery_notes
SET progress_percentage = calculate_progress_from_stage(current_stage_id)
WHERE current_stage_id IS NOT NULL;

-- Ajouter un index partiel pour optimiser les requêtes sur les étapes actives uniquement
DROP INDEX IF EXISTS idx_delivery_note_stages_active;
CREATE INDEX idx_delivery_note_stages_active
ON delivery_note_stages(delivery_note_id, stage_id)
WHERE is_completed = true OR (notes IS NOT NULL AND notes != '') OR time_spent_minutes > 0;

-- Ajouter un index sur current_stage_id pour optimiser les requêtes Kanban
DROP INDEX IF EXISTS idx_delivery_notes_current_stage;
CREATE INDEX idx_delivery_notes_current_stage
ON delivery_notes(current_stage_id)
WHERE status != 'completed' AND status != 'refused';

-- Optimiser l'index existant sur delivery_note_id
DROP INDEX IF EXISTS idx_delivery_note_stages_delivery_id;
CREATE INDEX idx_delivery_note_stages_delivery_id
ON delivery_note_stages(delivery_note_id);

-- Ajouter un commentaire sur la table production_stages pour documenter la dépréciation
COMMENT ON TABLE production_stages IS 'DEPRECATED: Cette table est conservée pour les données historiques uniquement. Les étapes de production sont maintenant gérées en frontend via src/config/defaultProductionStages.ts';

-- Statistiques finales
DO $$
DECLARE
  total_delivery_notes INTEGER;
  notes_with_stage INTEGER;
  avg_progress NUMERIC;
  total_stage_records INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_delivery_notes FROM delivery_notes WHERE status NOT IN ('completed', 'refused');
  SELECT COUNT(*) INTO notes_with_stage FROM delivery_notes WHERE current_stage_id IS NOT NULL AND status NOT IN ('completed', 'refused');
  SELECT AVG(progress_percentage) INTO avg_progress FROM delivery_notes WHERE status NOT IN ('completed', 'refused');
  SELECT COUNT(*) INTO total_stage_records FROM delivery_note_stages;

  RAISE NOTICE '';
  RAISE NOTICE '=== OPTIMISATION TERMINÉE ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Bons de livraison actifs: %', total_delivery_notes;
  RAISE NOTICE 'Bons avec étape assignée: % (%.1f%%)', notes_with_stage, (notes_with_stage::float / NULLIF(total_delivery_notes, 0) * 100);
  RAISE NOTICE 'Progression moyenne: %.1f%%', COALESCE(avg_progress, 0);
  RAISE NOTICE 'Enregistrements d étapes restants: %', total_stage_records;
  RAISE NOTICE '';
  RAISE NOTICE 'Les étapes sont maintenant gérées en frontend';
  RAISE NOTICE 'Seules les étapes avec données réelles sont stockées';
  RAISE NOTICE 'La progression est calculée automatiquement';
END $$;
