#!/usr/bin/env python3
"""Test the actual log format regex"""
import re

# Actual format pattern
event_pattern_actual = re.compile(
    r"Event #(\d+)\s*\n-*\s*\n(?:Time:\s*([\d\-:\s]+)\s*\n)?(?:Level:\s*(\w+)\s*\n)?(?:Source:\s*(.*?)\s*\n)?(?:Event ID:\s*(\d+)\s*\n)?(?:Category:\s*(.*?)\s*\n)?Message:\s*(.*?)(?=\n\n+Event #|\Z)",
    re.DOTALL | re.MULTILINE
)

# Read the file
with open('analysis_logs/10669022/soc-5CG5233YBT/2026-01-26_12-13-30/system_logs.txt', 'r') as f:
    content = f.read()

matches = list(event_pattern_actual.finditer(content))
print(f'Found {len(matches)} matches')

if matches:
    for i, match in enumerate(matches[:3]):
        groups = match.groups()
        print(f'\nMatch {i+1}:')
        print(f'  Event #: {groups[0]}')
        print(f'  Time: {groups[1]}')
        print(f'  Level: {groups[2]}')
        print(f'  Source: {groups[3]}')
        print(f'  Event ID: {groups[4]}')
        print(f'  Category: {groups[5]}')
        print(f'  Message: {groups[6][:80]}...')
