import re

with open('combined_migration.sql', 'r') as f:
    content = f.read()

# 1. CREATE POLICY "nom" ON table -> DROP POLICY IF EXISTS + CREATE POLICY
pattern_policy = r'CREATE POLICY "([^"]+)"(\s+)ON\s+(\w+)'
def add_drop_policy(match):
    policy_name = match.group(1)
    whitespace = match.group(2)
    table_name = match.group(3)
    return f'DROP POLICY IF EXISTS "{policy_name}" ON {table_name};\nCREATE POLICY "{policy_name}"{whitespace}ON {table_name}'
content = re.sub(pattern_policy, add_drop_policy, content, flags=re.MULTILINE)

# 2. CREATE TRIGGER nom ... FOR EACH ... EXECUTE -> DROP TRIGGER + CREATE TRIGGER
# On cherche les patterns comme: CREATE TRIGGER update_xxx_updated_at
# Pattern qui capture tout le trigger en plusieurs lignes
lines = content.split('\n')
new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # Si on trouve CREATE TRIGGER qui n'est pas dans un bloc DO $$
    if re.match(r'^\s*CREATE TRIGGER\s+(\w+)', line):
        # Vérifier qu'on n'est pas dans un bloc DO $$ (regarder les 10 lignes précédentes)
        in_do_block = False
        for j in range(max(0, i-10), i):
            if 'DO $$' in lines[j] or 'DO $do$' in lines[j]:
                in_do_block = True
                break
        
        if not in_do_block:
            match = re.match(r'^\s*CREATE TRIGGER\s+(\w+)', line)
            trigger_name = match.group(1)
            
            # Chercher le nom de la table dans les lignes suivantes (max 15 lignes)
            table_name = None
            for j in range(i, min(i+15, len(lines))):
                table_match = re.search(r'\s+ON\s+(\w+)', lines[j])
                if table_match:
                    table_name = table_match.group(1)
                    break
            
            if table_name:
                new_lines.append(f'DROP TRIGGER IF EXISTS {trigger_name} ON {table_name};')
        
    new_lines.append(line)
    i += 1

content = '\n'.join(new_lines)

# 3. Écrire le fichier final
with open('combined_migration_safe.sql', 'w') as f:
    f.write(content)

# Statistiques
drop_policy_count = content.count('DROP POLICY IF EXISTS')
drop_trigger_count = content.count('DROP TRIGGER IF EXISTS')

print(f"✅ Migration sécurisée créée !")
print(f"   - {drop_policy_count} politiques avec DROP POLICY IF EXISTS")
print(f"   - {drop_trigger_count} triggers avec DROP TRIGGER IF EXISTS")
