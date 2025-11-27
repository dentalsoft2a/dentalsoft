/*
  # Ajouter l'accès dentiste aux proforma_items
  
  1. Modifications
    - Ajouter une politique RLS pour permettre aux comptes dentistes de voir les proforma_items
      qui sont liés à leurs delivery_notes
  
  2. Sécurité
    - Les dentistes peuvent uniquement voir les proforma_items liés à leurs propres BL
    - Utilise la table dentists avec linked_dentist_account_id pour vérifier l'accès
*/

-- Permettre aux comptes dentistes de voir les proforma_items liés à leurs BL
CREATE POLICY "Dentist accounts can view proforma items for their delivery notes"
  ON proforma_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM delivery_notes dn
      JOIN dentists d ON d.id = dn.dentist_id
      WHERE dn.id = proforma_items.delivery_note_id
        AND d.linked_dentist_account_id = auth.uid()
    )
  );
