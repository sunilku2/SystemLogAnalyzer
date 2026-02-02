#!/usr/bin/env python3
"""
Diagnostic tool to inspect EVTX file structure and content
Helps identify why files aren't being parsed correctly
"""
import os
import sys
import re

def inspect_evtx_file(file_path):
    """Inspect an EVTX file to understand its structure"""
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    file_size = os.path.getsize(file_path)
    print(f"\n{'='*70}")
    print(f"EVTX File Inspection Report")
    print(f"{'='*70}")
    print(f"File: {file_path}")
    print(f"Size: {file_size:,} bytes")
    
    with open(file_path, 'rb') as f:
        content = f.read()
    
    # Check file header
    print(f"\nFile Header (first 100 bytes):")
    print(f"  Hex: {content[:100].hex()}")
    print(f"  ASCII: {content[:100]}")
    
    # Try to decode with different encodings
    print(f"\n{'='*70}")
    print(f"Decoding Attempts:")
    print(f"{'='*70}")
    
    for encoding in ['utf-16-le', 'utf-8', 'latin-1', 'utf-16-be']:
        try:
            decoded = content.decode(encoding, errors='ignore')
            print(f"\n✓ {encoding}: Success - {len(decoded)} characters")
            
            # Look for XML patterns
            xml_start = decoded.find('<')
            if xml_start >= 0:
                print(f"  First XML tag found at position {xml_start}")
                print(f"  Sample: {decoded[xml_start:xml_start+200]}")
            else:
                print(f"  No XML tags found")
        except Exception as e:
            print(f"\n✗ {encoding}: Failed - {e}")
    
    # Search for specific patterns
    print(f"\n{'='*70}")
    print(f"Pattern Search:")
    print(f"{'='*70}")
    
    # Try UTF-16LE as primary
    try:
        text = content.decode('utf-16-le', errors='ignore')
    except:
        try:
            text = content.decode('utf-8', errors='ignore')
        except:
            text = content.decode('latin-1', errors='ignore')
    
    patterns = {
        'SystemTime': r'<SystemTime>([^<]+)</SystemTime>',
        'EventID': r'<EventID>(\d+)</EventID>',
        'Level': r'<Level>(\d+|Critical|Error|Warning|Information|Verbose)</Level>',
        'Provider': r'<Provider\s+[^>]*Name="([^"]+)"',
        'Event elements': r'<Event[^>]*>',
        'Any XML tags': r'<[^>]+>',
    }
    
    for pattern_name, pattern_str in patterns.items():
        matches = list(re.finditer(pattern_str, text, re.IGNORECASE))
        print(f"\n{pattern_name}: {len(matches)} matches")
        if matches:
            for i, match in enumerate(matches[:3]):  # Show first 3
                print(f"  Match {i+1}: {match.group()[:80]}")
                if i >= 2:
                    if len(matches) > 3:
                        print(f"  ... and {len(matches)-3} more")
                    break
    
    # Check for null bytes and special markers
    print(f"\n{'='*70}")
    print(f"File Structure Analysis:")
    print(f"{'='*70}")
    
    null_count = content.count(b'\x00')
    print(f"Null bytes: {null_count:,} ({100*null_count/len(content):.1f}%)")
    
    # Look for record separators or markers
    markers = {
        b'ElfChnk': 'ElfChnk (EVTX chunk marker)',
        b'ElfFile': 'ElfFile (EVTX file marker)',
        b'Event>': 'Event closing tag',
        b'<Event': 'Event opening tag',
    }
    
    print(f"\nSpecial markers found:")
    for marker, desc in markers.items():
        count = content.count(marker)
        print(f"  {desc}: {count} occurrences")
    
    print(f"\n{'='*70}\n")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        # Use a default test file
        file_path = r'c:\Work\SystemLogAnalyzer\SystemLogAnalyzer\analysis_logs\10669022\soc-5CG5233YBT\2026-01-26_12-13-30\System.evtx'
    
    inspect_evtx_file(file_path)
