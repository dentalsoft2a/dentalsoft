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

# 2. CREATE TRIGGER nom ... ON table -> DROP TRIGGER IF EXISTS + CREATE TRIGGER
# Pattern pour capturer: CREATE TRIGGER nom ... ON table
pattern_trigger = r'CREATE TRIGGER\s+(\w+)([^\n]+?ON\s+(\w+))'
def replace_trigger(match):
    trigger_name = match.group(1)
    rest = match.group(2)
    table_name = match.group(3)
    return f'DROP TRIGGER IF EXISTS {trigger_name} ON {table_name};\nCREATE TRIGGER {trigger_name}{rest}'
content = re.sub(pattern_trigger, replace_trigger, content)

with open('combined_migration_safe.sql', 'w') as f:
    f.write(content)

print("✅ Fichier combined_migration_safe.sql créé avec:")
print(f"   - {content.count('DROP POLICY IF EXISTS')} DROP POLICY IF EXISTS")
print(f"   - {content.count('DROP TRIGGER IF EXISTS')} DROP TRIGGER IF EXISTS")
