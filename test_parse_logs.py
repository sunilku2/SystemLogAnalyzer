#!/usr/bin/env python3
"""Test parsing system_logs.txt"""
from log_parser import LogParser

parser = LogParser()
entries = parser.parse_log_file(
    'analysis_logs/10669022/soc-5CG5233YBT/2026-01-26_12-13-30/system_logs.txt', 
    '10669022', 
    'soc-5CG5233YBT', 
    '2026-01-26_12-13-30'
)

print(f'Parsed {len(entries)} entries from system_logs.txt')

if entries:
    print(f'\nFirst 3 entries:')
    for e in entries[:3]:
        print(f'  Event#{e.event_id:5} | {e.level:12} | {e.source[:30]:30}')
        print(f'    Message: {e.message[:60]}...')
