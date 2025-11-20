/*
  # Héritage des Extensions pour les Employés

  1. Objectif
    - Permettre aux employés d'accéder aux extensions du laboratoire auquel ils appartiennent
    - Les employés actifs héritent automatiquement des extensions de leur laboratoire
    - Les employés désactivés perdent immédiatement l'accès

  2. Nouvelle Politique RLS
    - Politique: "Employees can view laboratory extensions"
    - Table: user_extensions
    - Action: SELECT
    - Conditions:
      * L'employé doit être actif (is_active = true)
      * L'employé doit appartenir au laboratoire via laboratory_employees
      * Le user_id de l'extension doit correspondre au laboratory_profile_id

  3. Sécurité
    - Les employés ne voient QUE les extensions de leur laboratoire
    - Les employés désactivés n'ont aucun accès
    - Les propriétaires gardent l'accès à leurs propres extensions (politique existante)
    - Pas de conflit entre les politiques (OR logique)

  4. Compatibilité
    - Aucun impact sur les propriétaires de laboratoire
    - Aucun impact sur les super admins
    - Les politiques existantes restent inchangées
*/

-- Créer la politique pour permettre aux employés de voir les extensions du laboratoire
CREATE POLICY "Employees can view laboratory extensions"
  ON user_extensions FOR SELECT
  TO authenticated
  USING (
    -- L'employé actif peut voir les extensions du laboratoire auquel il appartient
    EXISTS (
      SELECT 1 FROM laboratory_employees le
      WHERE le.user_profile_id = auth.uid()
        AND le.laboratory_profile_id = user_extensions.user_id
        AND le.is_active = true
    )
  );

-- Statistiques et vérifications
DO $$
DECLARE
  total_employees INTEGER;
  active_employees INTEGER;
  laboratories_with_extensions INTEGER;
BEGIN
  -- Compter les employés
  SELECT COUNT(*) INTO total_employees FROM laboratory_employees;
  SELECT COUNT(*) INTO active_employees FROM laboratory_employees WHERE is_active = true;
  
  -- Compter les laboratoires avec extensions
  SELECT COUNT(DISTINCT user_id) INTO laboratories_with_extensions 
  FROM user_extensions 
  WHERE status = 'active';

  RAISE NOTICE '';
  RAISE NOTICE '=== HÉRITAGE DES EXTENSIONS POUR LES EMPLOYÉS ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Statistiques:';
  RAISE NOTICE '  Total employés: %', total_employees;
  RAISE NOTICE '  Employés actifs: %', active_employees;
  RAISE NOTICE '  Laboratoires avec extensions: %', laboratories_with_extensions;
  RAISE NOTICE '';
  RAISE NOTICE 'Politique RLS créée avec succès!';
  RAISE NOTICE 'Les employés actifs héritent maintenant des extensions de leur laboratoire';
  RAISE NOTICE '';
END $$;
