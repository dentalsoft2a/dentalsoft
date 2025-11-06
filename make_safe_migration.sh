#!/bin/bash

# Script pour créer une migration sécurisée avec DROP POLICY IF EXISTS

echo "Création d'une migration sécurisée..."

# Lire le fichier ligne par ligne et ajouter DROP POLICY IF EXISTS
python3 << 'PYTHON_EOF'
import re

with open('combined_migration.sql', 'r') as f:
    content = f.read()

# Pattern multi-ligne pour CREATE POLICY ... ON table
# On cherche: CREATE POLICY "nom"\n  ON table
pattern = r'CREATE POLICY "([^"]+)"(\s+)ON\s+(\w+)'

def add_drop(match):
    policy_name = match.group(1)
    whitespace = match.group(2)
    table_name = match.group(3)
    return f'DROP POLICY IF EXISTS "{policy_name}" ON {table_name};\nCREATE POLICY "{policy_name}"{whitespace}ON {table_name}'

# Remplacer toutes les occurrences
safe_content = re.sub(pattern, add_drop, content, flags=re.MULTILINE)

# Écrire le fichier sécurisé
with open('combined_migration_safe.sql', 'w') as f:
    f.write(safe_content)

# Compter les remplacements
drop_count = safe_content.count('DROP POLICY IF EXISTS')
print(f"✅ {drop_count} politiques sécurisées avec DROP IF EXISTS")

PYTHON_EOF

echo "✅ Fichier combined_migration_safe.sql créé"
