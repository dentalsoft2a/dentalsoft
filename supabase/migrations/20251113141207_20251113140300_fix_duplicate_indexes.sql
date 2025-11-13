/*
  # Correction sécurité - Partie 4: Suppression des index dupliqués
  
  Supprime les index identiques qui ralentissent les écritures inutilement.
*/

-- Supprimer l'index dupliqué sur delivery_note_stages.stage_id
-- Garder idx_delivery_note_stages_stage_id, supprimer idx_delivery_note_stages_stage
DROP INDEX IF EXISTS idx_delivery_note_stages_stage;

COMMENT ON INDEX idx_delivery_note_stages_stage_id IS 'Index sur stage_id pour les jointures rapides';
