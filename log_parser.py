"""
Log Parser Module - Parses various Windows Event Logs (both .log text files and .evtx binary files)
"""
import os
import re
from datetime import datetime
from typing import List, Dict, Tuple
from models import LogEntry

# Try to import EVTX parser (optional dependency)
try:
    from evtx_parser import EvtxParser
    EVTX_SUPPORT = True
except ImportError:
    EVTX_SUPPORT = False
    EvtxParser = None


class LogParser:
    """Parses Windows Event Log files (both .log and .evtx formats)"""
    
    def __init__(self):
        self.event_pattern = re.compile(
            r"Event #(\d+)\s*-+\s*Level:\s*(\w+)\s*Source:\s*([\w\s]+)\s*Event ID:\s*(\d+)\s*Time:\s*([\d\-:\s]+)\s*Message:\s*(.*?)(?=\n\nEvent #|\n\n\Z)",
            re.DOTALL | re.MULTILINE
        )
        # Initialize EVTX parser if available
        self.evtx_parser = EvtxParser() if EVTX_SUPPORT else None
    
    def parse_log_file(self, file_path: str, user_id: str, system_name: str, session_timestamp: str) -> List[LogEntry]:
        """Parse a single log file and extract all events (supports both .log and .evtx formats)"""
        
        # Check file extension and route to appropriate parser
        if file_path.lower().endswith('.evtx'):
            if self.evtx_parser:
                return self.evtx_parser.parse_evtx_file(file_path, user_id, system_name, session_timestamp)
            else:
                print(f"Warning: EVTX format not supported for {file_path}. Install pyevtx: pip install libevtx-python")
                return []
        else:
            # Parse as text-based log file
            return self._parse_text_log_file(file_path, user_id, system_name, session_timestamp)
    
    def _parse_text_log_file(self, file_path: str, user_id: str, system_name: str, session_timestamp: str) -> List[LogEntry]:
        """Parse text-based log files (.log format)"""
        log_entries = []
        log_type = os.path.basename(file_path).replace(".log", "")
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            matches = self.event_pattern.finditer(content)
            
            for match in matches:
                try:
                    event_num = int(match.group(1))
                    level = match.group(2).strip()
                    source = match.group(3).strip()
                    event_id = int(match.group(4))
                    timestamp_str = match.group(5).strip()
                    message = match.group(6).strip()
                    
                    # Parse timestamp
                    timestamp = self._parse_timestamp(timestamp_str)
                    
                    log_entry = LogEntry(
                        event_number=event_num,
                        level=level,
                        source=source,
                        event_id=event_id,
                        timestamp=timestamp,
                        message=message,
                        log_type=log_type,
                        user_id=user_id,
                        system_name=system_name,
                        session_timestamp=session_timestamp
                    )
                    log_entries.append(log_entry)
                    
                except Exception as e:
                    print(f"Error parsing event in {file_path}: {e}")
                    continue
                    
        except Exception as e:
            print(f"Error reading file {file_path}: {e}")
        
        return log_entries
    
    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse timestamp from various formats"""
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M:%S.%f",
            "%m/%d/%Y %H:%M:%S",
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(timestamp_str, fmt)
            except ValueError:
                continue
        
        # Default to current time if parsing fails
        return datetime.now()
    
    def discover_logs(self, base_logs_dir: str) -> List[Tuple[str, str, str, str]]:
        """
        Discover all log directories
        Returns: List of (user_id, system_name, session_timestamp, full_path)
        """
        discovered = []
        
        if not os.path.exists(base_logs_dir):
            print(f"Warning: Logs directory not found: {base_logs_dir}")
            return discovered
        
        # Walk through userid/systemname/timestamp structure
        for user_id in os.listdir(base_logs_dir):
            user_path = os.path.join(base_logs_dir, user_id)
            if not os.path.isdir(user_path):
                continue
            
            for system_name in os.listdir(user_path):
                system_path = os.path.join(user_path, system_name)
                if not os.path.isdir(system_path):
                    continue
                
                for session_timestamp in os.listdir(system_path):
                    session_path = os.path.join(system_path, session_timestamp)
                    if not os.path.isdir(session_path):
                        continue
                    
                    discovered.append((user_id, system_name, session_timestamp, session_path))
        
        return discovered
    
    def parse_all_logs(self, base_logs_dir: str, log_types: List[str]) -> List[LogEntry]:
        """Parse all logs from the directory structure (both .log text files and .evtx binary files)"""
        all_entries = []
        
        discovered_logs = self.discover_logs(base_logs_dir)
        print(f"Discovered {len(discovered_logs)} log sessions")
        
        for user_id, system_name, session_timestamp, session_path in discovered_logs:
            print(f"Parsing logs for User: {user_id}, System: {system_name}, Session: {session_timestamp}")
            
            # First, parse configured log types (.log files)
            for log_type in log_types:
                log_file_path = os.path.join(session_path, log_type)
                if os.path.exists(log_file_path):
                    entries = self.parse_log_file(log_file_path, user_id, system_name, session_timestamp)
                    all_entries.extend(entries)
                    print(f"  - Parsed {len(entries)} entries from {log_type}")
            
            # Also scan for any .evtx files in the session directory
            if os.path.isdir(session_path):
                for filename in os.listdir(session_path):
                    if filename.lower().endswith('.evtx'):
                        evtx_file_path = os.path.join(session_path, filename)
                        entries = self.parse_log_file(evtx_file_path, user_id, system_name, session_timestamp)
                        all_entries.extend(entries)
                        print(f"  - Parsed {len(entries)} entries from {filename} (EVTX)")
        
        print(f"\nTotal entries parsed: {len(all_entries)}")
        return all_entries
