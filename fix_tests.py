import os
import glob

test_files = glob.glob('tests/test_*.py')

old_str = 'json={"name": name, "email": email, "password": password}'
new_str = 'json={"name": name, "email": email, "password": password, "username": email.split("@")[0]}'

for file_path in test_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if old_str in content:
        content = content.replace(old_str, new_str)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file_path}")
