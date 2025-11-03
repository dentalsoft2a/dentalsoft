/*
  # Fix resource stock_quantity type to support decimals
  
  1. Changes
    - Change `stock_quantity` column in `resources` table from INTEGER to NUMERIC(10,4)
    - This allows storing decimal values for resources (e.g., 3.96 discs)
    
  2. Notes
    - NUMERIC(10,4) allows up to 10 digits total with 4 decimal places
    - This is necessary for resources that are consumed in fractional amounts
*/

ALTER TABLE resources 
ALTER COLUMN stock_quantity TYPE NUMERIC(10,4) USING stock_quantity::NUMERIC(10,4);