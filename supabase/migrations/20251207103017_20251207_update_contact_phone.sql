/*
  # Update Contact Phone Number
  
  Update the contact phone number in smtp_settings from +33 1 89 70 35 53 to 0970701767
*/

UPDATE smtp_settings
SET contact_phone = '09 70 70 17 67'
WHERE contact_phone = '+33 1 89 70 35 53';
