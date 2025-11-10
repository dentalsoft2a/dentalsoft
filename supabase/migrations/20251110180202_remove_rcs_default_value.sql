/*
  # Remove Default Value from RCS Field

  ## Overview
  Remove the default value from the laboratory_rcs field in profiles table.
  New user accounts should have an empty RCS field by default.

  ## Changes
  1. Alter Column
    - Remove default value from `laboratory_rcs` column
    - Field will be NULL for new accounts unless explicitly set

  ## Notes
  - Existing profiles will keep their current RCS values
  - New profiles will have NULL/empty RCS by default
  - Users can set their custom RCS from settings page
*/

-- Remove default value from laboratory_rcs column
ALTER TABLE profiles 
ALTER COLUMN laboratory_rcs DROP DEFAULT;