/*
  # Création des étapes de production par défaut pour tous les utilisateurs

  1. Objectif
    - Créer 6 étapes de production par défaut pour chaque utilisateur existant
    - Étapes : Réception, Modélisation, Production, Finition, Contrôle, Prêt

  2. Actions
    - Récupérer tous les utilisateurs de type 'laboratory' depuis user_profiles
    - Créer les 6 étapes pour chaque utilisateur
    - Définir des couleurs appropriées pour chaque étape

  3. Sécurité
    - Utilisation de INSERT ... ON CONFLICT DO NOTHING pour éviter les doublons
    - Aucune suppression de données existantes
*/

-- Fonction pour créer les étapes par défaut pour un utilisateur
DO $$
DECLARE
  lab_user RECORD;
BEGIN
  -- Pour chaque utilisateur de type laboratory
  FOR lab_user IN 
    SELECT DISTINCT up.id
    FROM user_profiles up
    WHERE up.role = 'laboratory'
  LOOP
    -- Créer les 6 étapes de production par défaut
    
    -- 1. Réception
    INSERT INTO production_stages (user_id, name, description, order_index, color, requires_approval)
    VALUES (
      lab_user.id,
      'Réception',
      'Réception et vérification du bon de livraison',
      1,
      '#3B82F6', -- Bleu
      false
    )
    ON CONFLICT DO NOTHING;

    -- 2. Modélisation
    INSERT INTO production_stages (user_id, name, description, order_index, color, requires_approval)
    VALUES (
      lab_user.id,
      'Modélisation',
      'Modélisation 3D et conception numérique',
      2,
      '#8B5CF6', -- Violet
      false
    )
    ON CONFLICT DO NOTHING;

    -- 3. Production
    INSERT INTO production_stages (user_id, name, description, order_index, color, requires_approval)
    VALUES (
      lab_user.id,
      'Production',
      'Fabrication et production des prothèses',
      3,
      '#F59E0B', -- Orange
      false
    )
    ON CONFLICT DO NOTHING;

    -- 4. Finition
    INSERT INTO production_stages (user_id, name, description, order_index, color, requires_approval)
    VALUES (
      lab_user.id,
      'Finition',
      'Finition et polissage des prothèses',
      4,
      '#EC4899', -- Rose
      false
    )
    ON CONFLICT DO NOTHING;

    -- 5. Contrôle Qualité
    INSERT INTO production_stages (user_id, name, description, order_index, color, requires_approval)
    VALUES (
      lab_user.id,
      'Contrôle Qualité',
      'Contrôle qualité et validation finale',
      5,
      '#EF4444', -- Rouge
      true
    )
    ON CONFLICT DO NOTHING;

    -- 6. Prêt à Livrer
    INSERT INTO production_stages (user_id, name, description, order_index, color, requires_approval)
    VALUES (
      lab_user.id,
      'Prêt à Livrer',
      'Prêt pour expédition au cabinet dentaire',
      6,
      '#10B981', -- Vert
      false
    )
    ON CONFLICT DO NOTHING;

  END LOOP;
END $$;
