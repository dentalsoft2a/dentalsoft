/*
  # Insertion des données prédéfinies pour cabinets dentaires

  1. Fournitures dentaires prédéfinies
    - Anesthésiques
    - Matériaux de restauration
    - Matériaux d'empreinte
    - Consommables
    - Matériel jetable
    - Désinfectants

  2. Actes dentaires prédéfinis
    - Consultations et diagnostics
    - Soins conservateurs
    - Prothèses
    - Chirurgie
    - Parodontologie
    - Orthodontie

  3. Notes
    - Prix indicatifs basés sur les tarifs conventionnés CPAM 2024
    - Les cabinets peuvent personnaliser ces tarifs
*/

-- =====================================================================
-- PART 1: Insérer les fournitures dentaires prédéfinies
-- =====================================================================

INSERT INTO predefined_dental_supplies (name, description, category, unit, has_batch_tracking, has_expiry_date) VALUES
  -- Anesthésiques
  ('Articaïne 1/200000', 'Anesthésique local avec adrénaline', 'Anesthésiques', 'cartouche', true, true),
  ('Lidocaïne 2% adrénaline', 'Anesthésique local standard', 'Anesthésiques', 'cartouche', true, true),
  ('Mépivacaïne 3%', 'Anesthésique local sans vasoconstricteur', 'Anesthésiques', 'cartouche', true, true),
  ('Aiguilles d''anesthésie 30G courtes', 'Aiguilles jetables pour injections', 'Anesthésiques', 'boîte', true, false),
  ('Aiguilles d''anesthésie 27G longues', 'Aiguilles longues pour bloc', 'Anesthésiques', 'boîte', true, false),
  
  -- Matériaux de restauration
  ('Composite universel', 'Résine composite photopolymérisable', 'Matériaux de restauration', 'seringue', true, true),
  ('Composite Flow', 'Résine fluide pour bases et réparations', 'Matériaux de restauration', 'seringue', true, true),
  ('Amalgame en capsule', 'Amalgame dentaire prédosé', 'Matériaux de restauration', 'capsule', true, true),
  ('Ciment verre ionomère', 'Ciment de restauration définitive', 'Matériaux de restauration', 'poudre/liquide', true, true),
  ('Ciment provisoire', 'Obturation temporaire', 'Matériaux de restauration', 'boîte', true, true),
  ('Adhésif dentinaire', 'Système de collage', 'Matériaux de restauration', 'flacon', true, true),
  ('Acide phosphorique 37%', 'Gel de mordançage', 'Matériaux de restauration', 'seringue', true, true),
  
  -- Matériaux d''empreinte
  ('Alginate', 'Matériau d''empreinte hydrocolloïde', 'Matériaux d''empreinte', 'sachet', true, true),
  ('Silicone par addition light', 'Silicone de précision léger', 'Matériaux d''empreinte', 'cartouche', true, true),
  ('Silicone par addition putty', 'Silicone lourd pour porte-empreinte', 'Matériaux d''empreinte', 'kit', true, true),
  ('Cire d''empreinte', 'Cire pour empreintes occlusales', 'Matériaux d''empreinte', 'plaque', false, false),
  
  -- Matériaux endodontiques
  ('Hypochlorite de sodium 2,5%', 'Solution d''irrigation canalaire', 'Endodontie', 'flacon', true, true),
  ('EDTA 17%', 'Solution chélatrice pour canaux', 'Endodontie', 'flacon', true, true),
  ('Gutta-percha', 'Cônes de gutta pour obturation', 'Endodontie', 'boîte', true, false),
  ('Ciment canalaire', 'Ciment pour obturation endodontique', 'Endodontie', 'tube', true, true),
  ('Limes endodontiques', 'Instruments rotatifs NiTi', 'Endodontie', 'boîte', true, false),
  
  -- Consommables
  ('Gants latex poudrés S', 'Gants d''examen stériles', 'Consommables', 'boîte', true, true),
  ('Gants latex poudrés M', 'Gants d''examen stériles', 'Consommables', 'boîte', true, true),
  ('Gants latex poudrés L', 'Gants d''examen stériles', 'Consommables', 'boîte', true, true),
  ('Gants nitrile sans poudre M', 'Gants hypoallergéniques', 'Consommables', 'boîte', true, true),
  ('Masques chirurgicaux', 'Masques 3 plis jetables', 'Consommables', 'boîte', false, false),
  ('Bavettes patient', 'Protection patient jetable', 'Consommables', 'paquet', false, false),
  ('Compresses stériles', 'Compresses de gaze 10x10cm', 'Consommables', 'boîte', false, false),
  ('Rouleaux salivaires', 'Rouleaux absorbants', 'Consommables', 'boîte', false, false),
  ('Gobelets jetables', 'Gobelets pour rinçage', 'Consommables', 'paquet', false, false),
  
  -- Matériel jetable
  ('Aiguilles d''aspiration', 'Embouts d''aspiration chirurgicale', 'Matériel jetable', 'boîte', false, false),
  ('Canules d''aspiration', 'Canules souples jetables', 'Matériel jetable', 'boîte', false, false),
  ('Seringues 5ml', 'Seringues d''irrigation stériles', 'Matériel jetable', 'boîte', false, false),
  ('Brosses à polir', 'Brossettes pour prophylaxie', 'Matériel jetable', 'boîte', false, false),
  ('Cupules à polir', 'Cupules prophylaxie en caoutchouc', 'Matériel jetable', 'boîte', false, false),
  ('Turbine dentaire jetable', 'Turbine à usage unique', 'Matériel jetable', 'unité', true, false),
  
  -- Désinfection et hygiène
  ('Solution désinfectante surfaces', 'Désinfectant multi-surfaces', 'Désinfection', 'bidon', true, true),
  ('Savon antiseptique', 'Savon pour lavage des mains', 'Désinfection', 'bidon', true, true),
  ('Gel hydroalcoolique', 'Solution désinfectante pour mains', 'Désinfection', 'flacon', true, true),
  ('Sachets stérilisation', 'Sachets autoclave avec indicateurs', 'Désinfection', 'boîte', false, false),
  ('Bacs de trempage', 'Bacs pour prédésinfection', 'Désinfection', 'unité', false, false),
  
  -- Radiologie
  ('Films radiographiques', 'Films péri-apicaux', 'Radiologie', 'boîte', true, true),
  ('Capteurs numériques jetables', 'Housses protection capteurs', 'Radiologie', 'boîte', false, false),
  ('Liquide révélateur', 'Pour développement manuel', 'Radiologie', 'bidon', true, true),
  ('Liquide fixateur', 'Pour développement manuel', 'Radiologie', 'bidon', true, true)
ON CONFLICT DO NOTHING;

-- =====================================================================
-- PART 2: Insérer les actes dentaires prédéfinis
-- =====================================================================

INSERT INTO predefined_dental_services (name, description, category, ccam_code, default_price, cpam_reimbursement, unit) VALUES
  -- Consultations et diagnostics
  ('Consultation', 'Consultation et examen bucco-dentaire', 'Consultations', 'C', 23.00, 16.10, 'acte'),
  ('Consultation complexe', 'Consultation approfondie', 'Consultations', 'CS', 46.00, 32.20, 'acte'),
  ('Radiographie rétro-alvéolaire', 'Radio intra-buccale', 'Diagnostics', 'LAQK001', 25.00, 17.50, 'cliché'),
  ('Radiographie panoramique', 'Orthopantomogramme', 'Diagnostics', 'LAQK003', 33.60, 23.52, 'cliché'),
  ('Télé-radiographie de profil', 'Radio céphalométrique', 'Diagnostics', 'LAQK005', 33.60, 23.52, 'cliché'),
  
  -- Soins conservateurs
  ('Détartrage complet', 'Détartrage sus et sous-gingival', 'Soins conservateurs', 'HBMD003', 28.92, 20.24, 'acte'),
  ('Surfaçage radiculaire', 'Par sextant', 'Soins conservateurs', 'HBMD038', 23.10, 16.17, 'sextant'),
  ('Carie 1 face', 'Obturation 1 face sur dent permanente', 'Soins conservateurs', 'HBMD149', 26.97, 18.88, 'acte'),
  ('Carie 2 faces', 'Obturation 2 faces sur dent permanente', 'Soins conservateurs', 'HBMD023', 45.38, 31.77, 'acte'),
  ('Carie 3 faces ou plus', 'Obturation 3 faces ou plus', 'Soins conservateurs', 'HBMD068', 60.95, 42.67, 'acte'),
  ('Obturation sur dent temporaire', 'Soin sur dent de lait', 'Soins conservateurs', 'HBMD395', 25.00, 17.50, 'acte'),
  ('Inlay-core', 'Reconstitution pré-prothétique', 'Soins conservateurs', 'HBLD029', 122.55, 85.79, 'acte'),
  ('Inlay-onlay céramique', 'Restauration indirecte collée', 'Soins conservateurs', 'HBMD018', 350.00, 122.55, 'acte'),
  
  -- Endodontie
  ('Dévitalisation incisive/canine', 'Traitement endodontique monoradiculé', 'Endodontie', 'HBMD014', 33.74, 23.62, 'acte'),
  ('Dévitalisation prémolaire', 'Traitement endodontique biradiculé', 'Endodontie', 'HBMD392', 48.20, 33.74, 'acte'),
  ('Dévitalisation molaire', 'Traitement endodontique pluriradiculé', 'Endodontie', 'HBMD041', 81.94, 57.36, 'acte'),
  ('Retraitement endodontique', 'Reprise traitement canalaire', 'Endodontie', 'HBMD045', 100.00, 70.00, 'acte'),
  
  -- Extractions
  ('Extraction dent permanente', 'Avulsion dentaire simple', 'Chirurgie', 'HBMD015', 33.44, 23.41, 'dent'),
  ('Extraction dent de sagesse incluse', 'Avulsion complexe', 'Chirurgie', 'HBMD035', 66.88, 46.82, 'dent'),
  ('Extraction dent temporaire', 'Avulsion dent de lait', 'Chirurgie', 'HBMD111', 16.72, 11.70, 'dent'),
  ('Curetage apical', 'Résection apicale', 'Chirurgie', 'HBMD037', 66.88, 46.82, 'acte'),
  ('Frénectomie', 'Section du frein', 'Chirurgie', 'HBMA005', 60.00, 42.00, 'acte'),
  
  -- Prothèses
  ('Couronne céramo-métallique', 'Couronne fixée sur dent', 'Prothèses', 'HBLD030', 500.00, 107.50, 'couronne'),
  ('Couronne tout céramique', 'Couronne esthétique', 'Prothèses', 'HBLD042', 600.00, 107.50, 'couronne'),
  ('Couronne sur implant', 'Couronne vissée ou scellée', 'Prothèses', 'HBLD089', 800.00, 0.00, 'couronne'),
  ('Bridge 3 éléments', 'Pont fixe métallo-céramique', 'Prothèses', 'HBLD031', 1300.00, 279.50, 'bridge'),
  ('Prothèse amovible complète', 'Dentier complet 14 dents', 'Prothèses', 'HBLD111', 1200.00, 182.75, 'prothèse'),
  ('Prothèse amovible partielle', 'Partiel résine ou stellite', 'Prothèses', 'HBLD046', 800.00, 127.84, 'prothèse'),
  ('Implant dentaire', 'Pose d''implant endo-osseux', 'Prothèses', 'HBED008', 1200.00, 0.00, 'implant'),
  ('Pilier implantaire', 'Pilier sur implant', 'Prothèses', 'HBLD318', 250.00, 0.00, 'pilier'),
  
  -- Orthodontie
  ('Semestre orthodontie enfant', 'Traitement actif -16 ans', 'Orthodontie', 'HBMD087', 193.50, 193.50, 'semestre'),
  ('Semestre orthodontie adulte', 'Traitement actif +16 ans', 'Orthodontie', 'HBMD113', 500.00, 0.00, 'semestre'),
  ('Gouttière Invisalign', 'Traitement par aligneurs', 'Orthodontie', '', 3500.00, 0.00, 'traitement'),
  ('Contention orthodontique', 'Appareil de contention', 'Orthodontie', 'HBMD220', 161.25, 161.25, 'appareil'),
  
  -- Parodontologie
  ('Gingivectomie', 'Chirurgie gingivale', 'Parodontologie', 'HBMD029', 60.00, 42.00, 'sextant'),
  ('Greffe gingivale', 'Greffe de conjonctif', 'Parodontologie', 'HBMA002', 350.00, 0.00, 'site'),
  ('Comblement osseux', 'Régénération osseuse guidée', 'Parodontologie', 'HBED003', 500.00, 0.00, 'site'),
  
  -- Pédodontie
  ('Scellement de sillons', 'Prévention caries enfant', 'Pédodontie', 'HBMD069', 21.69, 15.18, 'dent'),
  ('Application de fluor', 'Vernis fluoré', 'Pédodontie', '', 25.00, 0.00, 'séance'),
  
  -- Autres actes
  ('Attestation médicale', 'Certificat dentaire', 'Autres', '', 20.00, 0.00, 'document'),
  ('Essayage prothétique', 'Séance d''essayage', 'Autres', '', 30.00, 0.00, 'séance'),
  ('Réparation prothèse', 'Réparation appareil existant', 'Autres', 'HBLD003', 45.38, 31.77, 'réparation')
ON CONFLICT DO NOTHING;

-- =====================================================================
-- PART 3: Créer la fonction pour activer le module de facturation
-- =====================================================================

CREATE OR REPLACE FUNCTION enable_dental_billing_module(p_dentist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Activer le module de facturation pour le compte dentiste
  UPDATE dentist_accounts
  SET 
    cabinet_billing_enabled = true,
    account_type = 'cabinet'
  WHERE id = p_dentist_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Module de facturation activé avec succès'
  );
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION enable_dental_billing_module(uuid) TO authenticated;
