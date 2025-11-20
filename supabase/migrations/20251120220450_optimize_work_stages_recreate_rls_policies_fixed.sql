/*
  # Optimisation - Recréation des Politiques RLS (Corrigée)

  1. Objectif
    - Recréer les politiques RLS pour les employés
    - Utiliser les bons noms de colonnes (user_profile_id, laboratory_profile_id)
    - Assurer la sécurité des données

  2. Politiques
    - Employés peuvent voir les bons de livraison de leur laboratoire
    - Employés peuvent mettre à jour les bons selon leurs permissions
    - Employés peuvent gérer les étapes selon leurs permissions
*/

-- Politique pour que les employés voient les bons de leur laboratoire
CREATE POLICY "Employees can view laboratory delivery notes"
ON delivery_notes
FOR SELECT
TO authenticated
USING (
  -- L'employé doit appartenir au laboratoire propriétaire du bon
  EXISTS (
    SELECT 1 FROM laboratory_employees le
    JOIN user_profiles up ON up.id = le.user_profile_id
    WHERE up.id = auth.uid()
      AND le.laboratory_profile_id = delivery_notes.user_id
      AND le.is_active = true
  )
);

-- Politique pour que les employés puissent voir les étapes
CREATE POLICY "Employees can view delivery note stages"
ON delivery_note_stages
FOR SELECT
TO authenticated
USING (
  -- L'employé doit appartenir au laboratoire du bon de livraison
  EXISTS (
    SELECT 1 FROM delivery_notes dn
    JOIN laboratory_employees le ON le.laboratory_profile_id = dn.user_id
    JOIN user_profiles up ON up.id = le.user_profile_id
    WHERE dn.id = delivery_note_stages.delivery_note_id
      AND up.id = auth.uid()
      AND le.is_active = true
  )
);

-- Politique pour que les employés puissent insérer des étapes
CREATE POLICY "Employees can insert delivery note stages"
ON delivery_note_stages
FOR INSERT
TO authenticated
WITH CHECK (
  -- L'employé doit appartenir au laboratoire du bon de livraison
  EXISTS (
    SELECT 1 FROM delivery_notes dn
    JOIN laboratory_employees le ON le.laboratory_profile_id = dn.user_id
    JOIN user_profiles up ON up.id = le.user_profile_id
    WHERE dn.id = delivery_note_stages.delivery_note_id
      AND up.id = auth.uid()
      AND le.is_active = true
  )
);

-- Politique pour que les employés puissent mettre à jour des étapes
CREATE POLICY "Employees can update delivery note stages"
ON delivery_note_stages
FOR UPDATE
TO authenticated
USING (
  -- L'employé doit appartenir au laboratoire du bon de livraison
  EXISTS (
    SELECT 1 FROM delivery_notes dn
    JOIN laboratory_employees le ON le.laboratory_profile_id = dn.user_id
    JOIN user_profiles up ON up.id = le.user_profile_id
    WHERE dn.id = delivery_note_stages.delivery_note_id
      AND up.id = auth.uid()
      AND le.is_active = true
  )
)
WITH CHECK (
  -- Même vérification pour le WITH CHECK
  EXISTS (
    SELECT 1 FROM delivery_notes dn
    JOIN laboratory_employees le ON le.laboratory_profile_id = dn.user_id
    JOIN user_profiles up ON up.id = le.user_profile_id
    WHERE dn.id = delivery_note_stages.delivery_note_id
      AND up.id = auth.uid()
      AND le.is_active = true
  )
);

-- Politique pour que les employés puissent supprimer des étapes (pour le nettoyage)
CREATE POLICY "Employees can delete delivery note stages"
ON delivery_note_stages
FOR DELETE
TO authenticated
USING (
  -- L'employé doit appartenir au laboratoire du bon de livraison
  EXISTS (
    SELECT 1 FROM delivery_notes dn
    JOIN laboratory_employees le ON le.laboratory_profile_id = dn.user_id
    JOIN user_profiles up ON up.id = le.user_profile_id
    WHERE dn.id = delivery_note_stages.delivery_note_id
      AND up.id = auth.uid()
      AND le.is_active = true
  )
);

-- Log final
DO $$
BEGIN
  RAISE NOTICE 'Politiques RLS recréées avec succès';
  RAISE NOTICE 'Les employés peuvent maintenant accéder aux bons de leur laboratoire';
END $$;
