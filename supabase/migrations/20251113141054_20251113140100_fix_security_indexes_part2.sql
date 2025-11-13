/*
  # Correction sécurité - Partie 2: Index manquants (Tables F-P)
*/

-- fiscal_periods
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_closed_by ON fiscal_periods(closed_by);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_laboratory_id ON fiscal_periods(laboratory_id);

-- laboratory_employees
CREATE INDEX IF NOT EXISTS idx_laboratory_employees_created_by ON laboratory_employees(created_by);
CREATE INDEX IF NOT EXISTS idx_laboratory_employees_laboratory_profile_id ON laboratory_employees(laboratory_profile_id);

-- production_alerts
CREATE INDEX IF NOT EXISTS idx_production_alerts_delivery_note_id ON production_alerts(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_production_alerts_user_id ON production_alerts(user_id);

-- production_notes
CREATE INDEX IF NOT EXISTS idx_production_notes_employee_id ON production_notes(employee_id);
CREATE INDEX IF NOT EXISTS idx_production_notes_user_id ON production_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_production_notes_delivery_note_id ON production_notes(delivery_note_id);

-- production_photos
CREATE INDEX IF NOT EXISTS idx_production_photos_employee_id ON production_photos(employee_id);
CREATE INDEX IF NOT EXISTS idx_production_photos_delivery_note_id ON production_photos(delivery_note_id);

-- proforma_items
CREATE INDEX IF NOT EXISTS idx_proforma_items_delivery_note_id ON proforma_items(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_proforma_items_proforma_id ON proforma_items(proforma_id);
