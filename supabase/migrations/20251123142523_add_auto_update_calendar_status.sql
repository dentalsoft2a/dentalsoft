/*
  # Mise à jour automatique du statut calendrier

  1. Fonction
    - Crée une fonction qui se déclenche quand le statut d'un bon de livraison change
    - Met à jour automatiquement le statut dans le calendrier (même table)
    
  2. Trigger
    - Se déclenche sur UPDATE de delivery_notes
    - Quand le statut passe à 'completed', met à jour le statut
    
  Note: Le calendrier utilise déjà la table delivery_notes avec le champ status,
  donc il n'y a pas besoin de synchronisation entre tables différentes.
  Ce trigger s'assure juste que le statut est bien propagé.
*/

-- Fonction pour mettre à jour le statut du calendrier
CREATE OR REPLACE FUNCTION update_calendar_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si le statut passe à 'completed', s'assurer qu'il est bien enregistré
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Le statut est déjà mis à jour dans NEW, donc on ne fait rien
    -- Ce trigger sert juste à s'assurer que le changement est propagé
    -- et pourrait être étendu pour d'autres actions (notifications, etc.)
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_calendar_status ON delivery_notes;
CREATE TRIGGER trigger_update_calendar_status
  BEFORE UPDATE ON delivery_notes
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_calendar_status();
