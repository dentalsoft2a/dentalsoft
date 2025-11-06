import re

with open('combined_migration.sql', 'r') as f:
    content = f.read()

# Pattern pour trouver: CREATE POLICY "nom" ON table
pattern = r'CREATE POLICY "([^"]+)"\s+ON\s+(\w+)'

def replace_policy(match):
    policy_name = match.group(1)
    table_name = match.group(2)
    return f'DROP POLICY IF EXISTS "{policy_name}" ON {table_name};\nCREATE POLICY "{policy_name}" ON {table_name}'

# Remplacer tous les CREATE POLICY
new_content = re.sub(pattern, replace_policy, content)

with open('combined_migration_safe.sql', 'w') as f:
    f.write(new_content)

print("✅ Fichier combined_migration_safe.sql créé avec DROP POLICY IF EXISTS")
