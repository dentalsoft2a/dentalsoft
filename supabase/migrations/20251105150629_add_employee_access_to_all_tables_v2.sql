/*
  # Allow employees to access their laboratory's data

  1. Changes
    - Add policies to allow employees to access all data belonging to their laboratory
    - Covers: dentists, proformas, delivery_notes, invoices, patients, catalog_items, resources, etc.
  
  2. Security
    - Employee must have an active record in laboratory_employees table
    - Can only access data for their assigned laboratory
*/

-- Dentists
CREATE POLICY "Employees can view their laboratory dentists"
  ON dentists FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = dentists.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory dentists"
  ON dentists FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = dentists.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = dentists.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Proformas
CREATE POLICY "Employees can view their laboratory proformas"
  ON proformas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = proformas.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory proformas"
  ON proformas FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = proformas.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = proformas.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Proforma Items
CREATE POLICY "Employees can view their laboratory proforma items"
  ON proforma_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proformas p
      INNER JOIN laboratory_employees le ON le.laboratory_profile_id = p.user_id
      WHERE le.user_profile_id = auth.uid()
        AND p.id = proforma_items.proforma_id
        AND le.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory proforma items"
  ON proforma_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proformas p
      INNER JOIN laboratory_employees le ON le.laboratory_profile_id = p.user_id
      WHERE le.user_profile_id = auth.uid()
        AND p.id = proforma_items.proforma_id
        AND le.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proformas p
      INNER JOIN laboratory_employees le ON le.laboratory_profile_id = p.user_id
      WHERE le.user_profile_id = auth.uid()
        AND p.id = proforma_items.proforma_id
        AND le.is_active = true
    )
  );

-- Delivery Notes
CREATE POLICY "Employees can view their laboratory delivery notes"
  ON delivery_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = delivery_notes.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory delivery notes"
  ON delivery_notes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = delivery_notes.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = delivery_notes.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Invoices
CREATE POLICY "Employees can view their laboratory invoices"
  ON invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = invoices.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory invoices"
  ON invoices FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = invoices.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = invoices.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Patients
CREATE POLICY "Employees can view their laboratory patients"
  ON patients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = patients.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory patients"
  ON patients FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = patients.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = patients.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Catalog Items
CREATE POLICY "Employees can view their laboratory catalog items"
  ON catalog_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = catalog_items.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory catalog items"
  ON catalog_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = catalog_items.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = catalog_items.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Resources
CREATE POLICY "Employees can view their laboratory resources"
  ON resources FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = resources.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory resources"
  ON resources FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = resources.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = resources.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Resource Variants
CREATE POLICY "Employees can view their laboratory resource variants"
  ON resource_variants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resources r
      INNER JOIN laboratory_employees le ON le.laboratory_profile_id = r.user_id
      WHERE le.user_profile_id = auth.uid()
        AND r.id = resource_variants.resource_id
        AND le.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory resource variants"
  ON resource_variants FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resources r
      INNER JOIN laboratory_employees le ON le.laboratory_profile_id = r.user_id
      WHERE le.user_profile_id = auth.uid()
        AND r.id = resource_variants.resource_id
        AND le.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resources r
      INNER JOIN laboratory_employees le ON le.laboratory_profile_id = r.user_id
      WHERE le.user_profile_id = auth.uid()
        AND r.id = resource_variants.resource_id
        AND le.is_active = true
    )
  );

-- Stock Movements
CREATE POLICY "Employees can view their laboratory stock movements"
  ON stock_movements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = stock_movements.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory stock movements"
  ON stock_movements FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = stock_movements.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = stock_movements.user_id
        AND laboratory_employees.is_active = true
    )
  );

-- Credit Notes
CREATE POLICY "Employees can view their laboratory credit notes"
  ON credit_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = credit_notes.user_id
        AND laboratory_employees.is_active = true
    )
  );

CREATE POLICY "Employees can manage their laboratory credit notes"
  ON credit_notes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = credit_notes.user_id
        AND laboratory_employees.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.user_profile_id = auth.uid()
        AND laboratory_employees.laboratory_profile_id = credit_notes.user_id
        AND laboratory_employees.is_active = true
    )
  );
