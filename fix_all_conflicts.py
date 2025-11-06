import re

with open('combined_migration.sql', 'r') as f:
    content = f.read()

# 1. CREATE POLICY "nom" ON table -> DROP POLICY IF EXISTS + CREATE POLICY
pattern_policy = r'CREATE POLICY "([^"]+)"\s+ON\s+(\w+)'
def replace_policy(match):
    policy_name = match.group(1)
    table_name = match.group(2)
    return f'DROP POLICY IF EXISTS "{policy_name}" ON {table_name};\nCREATE POLICY "{policy_name}" ON {table_name}'
content = re.sub(pattern_policy, replace_policy, content)

# 2. CREATE UNIQUE INDEX nom ON -> DROP INDEX IF EXISTS + CREATE UNIQUE INDEX
pattern_unique_index = r'CREATE UNIQUE INDEX\s+(\w+)\s+ON'
def replace_unique_index(match):
    index_name = match.group(1)
    return f'DROP INDEX IF EXISTS {index_name};\nCREATE UNIQUE INDEX {index_name} ON'
content = re.sub(pattern_unique_index, replace_unique_index, content)

# 3. CREATE INDEX nom ON -> DROP INDEX IF EXISTS + CREATE INDEX
pattern_index = r'CREATE INDEX\s+(\w+)\s+ON'
def replace_index(match):
    index_name = match.group(1)
    return f'DROP INDEX IF EXISTS {index_name};\nCREATE INDEX {index_name} ON'
content = re.sub(pattern_index, replace_index, content)

# 4. CREATE TRIGGER nom -> DROP TRIGGER IF EXISTS + CREATE TRIGGER
pattern_trigger = r'CREATE TRIGGER\s+(\w+)'
def replace_trigger(match):
    trigger_name = match.group(1)
    return f'DROP TRIGGER IF EXISTS {trigger_name} ON;\nCREATE TRIGGER {trigger_name}'
content = re.sub(pattern_trigger, replace_trigger, content)

# 5. CREATE OR REPLACE FUNCTION reste inchangé (déjà idempotent)

# 6. ALTER TABLE ... ADD CONSTRAINT -> géré par DO $$ dans les migrations

with open('combined_migration_safe.sql', 'w') as f:
    f.write(content)

print("✅ Fichier combined_migration_safe.sql créé")
print("   - Ajout de DROP POLICY IF EXISTS")
print("   - Ajout de DROP INDEX IF EXISTS")
print("   - Ajout de DROP TRIGGER IF EXISTS")
