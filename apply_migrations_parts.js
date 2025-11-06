import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables manquantes: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrationPart(partNumber) {
  const filename = `migration_part_${partNumber}.sql`;
  
  try {
    console.log(`\n📦 Partie ${partNumber}/10...`);
    const sql = readFileSync(filename, 'utf-8');
    
    const { data, error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error(`❌ Erreur partie ${partNumber}:`, error.message);
      return false;
    }
    
    console.log(`✅ Partie ${partNumber}/10 appliquée`);
    return true;
  } catch (err) {
    console.error(`❌ Erreur lecture fichier ${filename}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Application des migrations en 10 parties\n');
  console.log(`📡 Supabase: ${supabaseUrl}`);
  
  for (let i = 1; i <= 9; i++) {
    const success = await applyMigrationPart(i);
    if (!success) {
      console.error(`\n❌ Arrêt à la partie ${i}`);
      process.exit(1);
    }
    // Pause de 1 seconde entre chaque partie
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ TOUTES LES MIGRATIONS APPLIQUÉES !');
  console.log('\n🎯 Prochaines étapes:');
  console.log('   1. Corrigez l\'URL Supabase dans Coolify (enlever le / final)');
  console.log('   2. Redéployez l\'application');
}

main();
