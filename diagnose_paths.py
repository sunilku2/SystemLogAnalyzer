#!/usr/bin/env python3
"""Diagnostic tool to debug path reading issues with timestamp-format directory names"""
import os
import sys

BASE_DIR = r'C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\analysis_logs'

print("="*80)
print("PATH READING DIAGNOSTIC")
print("="*80)
print(f"\nBase directory: {BASE_DIR}")
print(f"Exists: {os.path.exists(BASE_DIR)}")
print(f"Is directory: {os.path.isdir(BASE_DIR)}")
print()

# Level 1: User directories
print("LEVEL 1 - User IDs:")
try:
    user_ids = os.listdir(BASE_DIR)
    print(f"  Found {len(user_ids)} items:")
    for uid in user_ids:
        uid_path = os.path.join(BASE_DIR, uid)
        print(f"    - {uid}")
        print(f"      Type: {'DIR' if os.path.isdir(uid_path) else 'FILE'}")
        print(f"      Full path: {uid_path}")
        print(f"      Path repr: {repr(uid_path)}")
except Exception as e:
    print(f"  ERROR: {e}")

# Level 2: System names
print("\nLEVEL 2 - System Names:")
for user_id in user_ids:
    user_path = os.path.join(BASE_DIR, user_id)
    if os.path.isdir(user_path):
        try:
            systems = os.listdir(user_path)
            print(f"  User '{user_id}' has {len(systems)} system entries:")
            for sys in systems:
                sys_path = os.path.join(user_path, sys)
                print(f"    - {sys}")
                print(f"      Type: {'DIR' if os.path.isdir(sys_path) else 'FILE'}")
                print(f"      Full path: {sys_path}")
        except Exception as e:
            print(f"  ERROR reading {user_path}: {e}")

# Level 3: Session timestamps
print("\nLEVEL 3 - Session Timestamps (with date-time format):")
for user_id in user_ids:
    user_path = os.path.join(BASE_DIR, user_id)
    if os.path.isdir(user_path):
        for system_name in os.listdir(user_path):
            sys_path = os.path.join(user_path, system_name)
            if os.path.isdir(sys_path):
                try:
                    sessions = os.listdir(sys_path)
                    print(f"  System '{system_name}' has {len(sessions)} session entries:")
                    for session in sessions:
                        session_path = os.path.join(sys_path, session)
                        print(f"    - {session}")
                        print(f"      Type: {'DIR' if os.path.isdir(session_path) else 'FILE'}")
                        print(f"      Full path: {session_path}")
                        print(f"      Path repr: {repr(session_path)}")
                        
                        # Try to read from this path
                        if os.path.isdir(session_path):
                            try:
                                files = os.listdir(session_path)
                                print(f"      Can read: YES ({len(files)} files)")
                                print(f"      Files: {files}")
                            except Exception as e:
                                print(f"      Can read: NO - {e}")
                except Exception as e:
                    print(f"  ERROR reading {sys_path}: {e}")

# Level 4: Test file path construction and reading
print("\nLEVEL 4 - File Path Construction Test:")
test_files = [
    'system_logs.txt',
    'application_logs.txt',
    'network_logs.txt'
]

for user_id in user_ids[:1]:  # Just test first user
    user_path = os.path.join(BASE_DIR, user_id)
    for system_name in os.listdir(user_path)[:1]:  # Just test first system
        sys_path = os.path.join(user_path, system_name)
        for session in os.listdir(sys_path)[:1]:  # Just test first session
            session_path = os.path.join(sys_path, session)
            print(f"\n  Session path: {session_path}")
            print(f"  Session path exists: {os.path.exists(session_path)}")
            
            for test_file in test_files:
                file_path = os.path.join(session_path, test_file)
                exists = os.path.exists(file_path)
                is_file = os.path.isfile(file_path)
                print(f"\n    Testing: {test_file}")
                print(f"      Full path: {file_path}")
                print(f"      Path repr: {repr(file_path)}")
                print(f"      Exists: {exists}")
                print(f"      Is file: {is_file}")
                if exists and is_file:
                    try:
                        size = os.path.getsize(file_path)
                        print(f"      Size: {size} bytes")
                        # Try to open and read first line
                        with open(file_path, 'r') as f:
                            first_line = f.readline()
                            print(f"      First line: {first_line[:60]}")
                    except Exception as e:
                        print(f"      Read error: {e}")

print("\n" + "="*80)
print("DIAGNOSTIC COMPLETE")
print("="*80)
