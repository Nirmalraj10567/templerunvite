
import os

filepath = '/var/www/templerunvite/src/pages/daybook/DaybookListPage.tsx'
# Read with latin-1 which accepts all bytes
with open(filepath, 'r', encoding='latin-1') as f:
    content = f.read()

target = "{entry.amount === 0 ? entry.notes?.match(/\\(([^)]+)\\)/)?.[1]?.replace(/people/i, '') || entry.amount : entry.amount}"
replacement = "{(entry as any).food_details?.reduce((sum: number, s: any) => sum + (Number(s.count) || 0), 0) || 0}"

new_content = content.replace(target, replacement)

# Write back as utf-8
with open(filepath, 'w', encoding='utf-8', errors='replace') as f:
    f.write(new_content)
