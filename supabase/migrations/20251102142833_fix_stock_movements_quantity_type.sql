/*
  # Fix stock_movements quantity type to support decimals
  
  1. Changes
    - Change `quantity` column in `stock_movements` table from INTEGER to NUMERIC(10,4)
    - This allows recording fractional quantities in stock movements
    
  2. Notes
    - NUMERIC(10,4) allows up to 10 digits total with 4 decimal places
    - This is necessary for tracking resource consumption in fractional amounts
    - Example: 1.0357 discs consumed
*/

ALTER TABLE stock_movements 
ALTER COLUMN quantity TYPE NUMERIC(10,4) USING quantity::NUMERIC(10,4);