#!/usr/bin/env python3
"""Debug the regex matching"""
import re

with open('analysis_logs/10669022/soc-5CG5233YBT/2026-01-26_12-13-30/system_logs.txt', 'r') as f:
    content = f.read()

# Extract just the first event section
first_event_idx = content.find('Event #1')
last_event_idx = content.find('Event #2')
first_event_text = content[first_event_idx:last_event_idx]

print("FIRST EVENT TEXT:")
print(repr(first_event_text[:500]))
print("\n")

# Test different patterns
patterns = [
    ('Simple Event extract', r"Event #(\d+)"),
    ('With dashes', r"Event #(\d+)\s*\n-+"),
    ('With time', r"Event #(\d+)\s*\n-+.*?Time:\s*(.+?)\n"),
    ('Full pattern', r"Event #(\d+)\s*\n-+\s*\n(?:Time:\s*([\d\-:]+)\s*\n)?(?:Level:\s*(\w+)\s*\n)?(?:Source:\s*(.*?)\s*\n)?(?:Event ID:\s*(\d+)\s*\n)?(?:Category:\s*(.*?)\s*\n)?Message:\s*(.*?)(?=\n={4,}|\nEvent #|\Z)"),
]

for name, pattern_str in patterns:
    try:
        p = re.compile(pattern_str, re.DOTALL | re.MULTILINE)
        matches = list(p.finditer(first_event_text))
        print(f'{name}: {len(matches)} matches')
        if matches:
            m = matches[0]
            print(f'  Groups: {len(m.groups())}')
            for i, g in enumerate(m.groups()[:5]):
                if g:
                    print(f'    {i}: {repr(g[:60])}...')
    except Exception as e:
        print(f'{name}: ERROR - {e}')
    print()
