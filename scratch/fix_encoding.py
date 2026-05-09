import os

def fix_file(path):
    with open(path, 'rb') as f:
        content = f.read()
    
    # Try to decode as utf-8, ignoring errors
    decoded = content.decode('utf-8', errors='ignore')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(decoded)

fix_file('/var/www/templerunvite/src/pages/daybook/DaybookListPage.tsx')
print("File fixed (non-utf8 characters removed)")
