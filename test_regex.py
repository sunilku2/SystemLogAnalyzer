#!/usr/bin/env python3
"""Quick test to verify log parsing regex"""
import re

# Multi-line format pattern
event_pattern_multiline = re.compile(
    r"Event #(\d+)\s*\n-*\s*\n(?:Level:\s*(\w+)\s*\n)?(?:Source:\s*(.*?)\s*\n)?(?:Event ID:\s*(\d+)\s*\n)?(?:Time:\s*([\d\-:\s]+)\s*\n)?Message:\s*(.*?)(?=\n\nEvent #|\Z)",
    re.DOTALL | re.MULTILINE
)

# Sample text from the log file
sample_text = """Event #1
--------------------------------------------------------------------------------
Level: Information
Source: Service Control Manager
Event ID: 7040
Time: 2026-01-26 12:05:36
Message: The start type of the Background Intelligent Transfer Service service was changed from auto start to demand start.

Event #2
--------------------------------------------------------------------------------
Level: Warning
Source: System
Event ID: 1234
Time: 2026-01-26 12:06:45
Message: This is a test warning message.
"""

matches = list(event_pattern_multiline.finditer(sample_text))
print(f"Found {len(matches)} matches\n")

for i, match in enumerate(matches):
    groups = match.groups()
    print(f"Match {i+1}:")
    print(f"  Event #: {groups[0]}")
    print(f"  Level: {groups[1]}")
    print(f"  Source: {groups[2]}")
    print(f"  Event ID: {groups[3]}")
    print(f"  Time: {groups[4]}")
    print(f"  Message: {groups[5][:50]}...")
    print()
