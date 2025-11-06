import os

# Lire tous les fichiers de migration
migration_dir = "supabase/migrations"
files = sorted([f for f in os.listdir(migration_dir) if f.endswith('.sql')])

print(f"Total migrations: {len(files)}")

# Diviser en 10 parties
parts = 10
files_per_part = len(files) // parts + (1 if len(files) % parts else 0)

for part_num in range(1, parts + 1):
    start_idx = (part_num - 1) * files_per_part
    end_idx = min(start_idx + files_per_part, len(files))
    part_files = files[start_idx:end_idx]
    
    if not part_files:
        break
    
    # Créer le contenu de la partie
    content = f"-- ============================================\n"
    content += f"-- PARTIE {part_num}/10 - Migrations {start_idx + 1} à {end_idx}\n"
    content += f"-- ============================================\n\n"
    
    for filename in part_files:
        filepath = os.path.join(migration_dir, filename)
        content += f"-- ============================================\n"
        content += f"-- Migration: {filename}\n"
        content += f"-- ============================================\n\n"
        
        with open(filepath, 'r') as f:
            content += f.read()
        
        content += "\n\n"
    
    # Écrire la partie
    output_file = f"migration_part_{part_num}.sql"
    with open(output_file, 'w') as f:
        f.write(content)
    
    print(f"✅ Partie {part_num}: {len(part_files)} migrations ({output_file})")

print(f"\n✅ {parts} fichiers créés (migration_part_1.sql à migration_part_{parts}.sql)")
