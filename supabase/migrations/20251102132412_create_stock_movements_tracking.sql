/*
  # Create Stock Movements Tracking System

  1. New Tables
    - `stock_movements`
      - `id` (uuid, primary key)
      - `catalog_item_id` (uuid, foreign key to catalog_items)
      - `delivery_note_id` (uuid, foreign key to delivery_notes, nullable)
      - `quantity` (integer) - positive for additions, negative for deductions
      - `movement_type` (text) - 'delivery_note', 'manual_adjustment', 'return', etc.
      - `notes` (text, nullable)
      - `created_at` (timestamp)
      - `created_by` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on `stock_movements` table
    - Add policies for users to manage their own stock movements

  3. Notes
    - This table tracks all stock movements for audit purposes
    - Allows rollback when delivery notes are cancelled
    - Provides full history of stock changes
*/

CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id uuid NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  delivery_note_id uuid REFERENCES delivery_notes(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  movement_type text NOT NULL DEFAULT 'manual_adjustment',
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
  );

CREATE POLICY "Users can insert own stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "Users can update own stock movements"
  ON stock_movements FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
  )
  WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "Users can delete own stock movements"
  ON stock_movements FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_catalog_item ON stock_movements(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_delivery_note ON stock_movements(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON stock_movements(created_by);
