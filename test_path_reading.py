#!/usr/bin/env python3
"""Quick test for path reading with timestamp format"""
import os

# The problematic session name with timestamp format
session_name = '2026-01-26_12-13-30'

# Test path construction
base = r'C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\analysis_logs'
user = '10669022'
system = 'soc-5CG5233YBT'

# Method 1: os.path.join
path1 = os.path.join(base, user, system, session_name)
print(f"Method 1 (os.path.join): {path1}")
print(f"  Exists: {os.path.exists(path1)}")

# Method 2: f-string
path2 = f"{base}\\{user}\\{system}\\{session_name}"
print(f"\nMethod 2 (f-string): {path2}")
print(f"  Exists: {os.path.exists(path2)}")

# Method 3: Direct
path3 = base + "\\" + user + "\\" + system + "\\" + session_name
print(f"\nMethod 3 (concatenation): {path3}")
print(f"  Exists: {os.path.exists(path3)}")

# List what's in system directory
print(f"\nContents of {base}\\{user}\\{system}:")
try:
    items = os.listdir(os.path.join(base, user, system))
    for item in items:
        print(f"  - {item}")
        item_path = os.path.join(base, user, system, item)
        print(f"    Is dir: {os.path.isdir(item_path)}")
        if os.path.isdir(item_path):
            files = os.listdir(item_path)
            print(f"    Files: {files[:3]}")
except Exception as e:
    print(f"  ERROR: {e}")

# Test with actual session path
actual_session_dir = os.path.join(base, user, system, session_name)
if os.path.isdir(actual_session_dir):
    print(f"\nActual session directory found!")
    print(f"Path: {actual_session_dir}")
    files = os.listdir(actual_session_dir)
    print(f"Contents ({len(files)} files):")
    for f in files:
        full_path = os.path.join(actual_session_dir, f)
        print(f"  - {f} (exists: {os.path.exists(full_path)}, isfile: {os.path.isfile(full_path)})")
else:
    print(f"\nSession directory NOT FOUND: {actual_session_dir}")
