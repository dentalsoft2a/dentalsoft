import re

with open('combined_migration.sql', 'r') as f:
    lines = f.readlines()

output_lines = []
i = 0

while i < len(lines):
    line = lines[i]
    
    # 1. Remplacer CREATE POLICY par DROP + CREATE
    if re.match(r'\s*CREATE POLICY "([^"]+)"\s+ON\s+(\w+)', line):
        match = re.match(r'\s*CREATE POLICY "([^"]+)"\s+ON\s+(\w+)', line)
        policy_name = match.group(1)
        table_name = match.group(2)
        output_lines.append(f'DROP POLICY IF EXISTS "{policy_name}" ON {table_name};\n')
        output_lines.append(line)
    
    # 2. Gérer les CREATE TRIGGER (hors DO blocks)
    elif re.match(r'^\s*CREATE TRIGGER\s+(\w+)', line) and 'DO $$' not in ''.join(lines[max(0,i-10):i]):
        match = re.match(r'^\s*CREATE TRIGGER\s+(\w+)', line)
        trigger_name = match.group(1)
        # Chercher le nom de la table dans les lignes suivantes
        table_name = None
        for j in range(i, min(i+10, len(lines))):
            table_match = re.search(r'\s+ON\s+(\w+)', lines[j])
            if table_match:
                table_name = table_match.group(1)
                break
        if table_name:
            output_lines.append(f'DROP TRIGGER IF EXISTS {trigger_name} ON {table_name};\n')
        output_lines.append(line)
    
    else:
        output_lines.append(line)
    
    i += 1

with open('combined_migration_safe.sql', 'w') as f:
    f.writelines(output_lines)

print("✅ Migration sécurisée créée : combined_migration_safe.sql")
