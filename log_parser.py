"""
Log Parser Module - Parses various Windows Event Logs (both .log text files and .evtx binary files)
"""
import os
import re
import logging
from datetime import datetime
from typing import List, Dict, Tuple
from models import LogEntry

logger = logging.getLogger('log_analyzer.parser')

# Try to import EVTX parser (optional dependency)
try:
    from evtx_parser import EvtxParser
    EVTX_SUPPORT = True
    logger.info('EVTX support enabled')
except ImportError:
    EVTX_SUPPORT = False
    EvtxParser = None
    logger.debug('EVTX support not available')


class LogParser:
    """Parses Windows Event Log files (both .log and .evtx formats)"""
    
    def __init__(self):
        # Pattern for actual format: Event #, Time, Level, Source, Event ID, Category, Message
        # Use [^\n]+ for fields to match everything on a line
        self.event_pattern_actual = re.compile(
            r"Event #(\d+)\s*\n-+\s*\n"
            r"Time:\s*([^\n]+)\s*\n"
            r"Level:\s*([^\n]+)\s*\n"
            r"Source:\s*([^\n]+)\s*\n"
            r"Event ID:\s*([^\n]+)\s*\n"
            r"Category:\s*([^\n]+)\s*\n"
            r"Message:\s*\n"
            r"([^\n]*(?:\n(?!\n).[^\n]*)*)",  # Message until double newline
            re.MULTILINE
        )
        # Pattern for multi-line format (Level, Source, Event ID, Time order)
        self.event_pattern_multiline = re.compile(
            r"Event #(\d+)\s*\n-*\s*\n(?:Level:\s*(\w+)\s*\n)?(?:Source:\s*(.*?)\s*\n)?(?:Event ID:\s*(\d+)\s*\n)?(?:Time:\s*([\d\-:\s]+)\s*\n)?Message:\s*\n?(.*?)(?=\n\nEvent #|\Z)",
            re.DOTALL | re.MULTILINE
        )
        # Pattern for single-line event format (backward compatibility)
        self.event_pattern_inline = re.compile(
            r"Event #(\d+)\s*-+\s*Level:\s*(\w+)\s*Source:\s*([\w\s]+)\s*Event ID:\s*(\d+)\s*Time:\s*([\d\-:\s]+)\s*Message:\s*(.*?)(?=\n\nEvent #|\n\n\Z)",
            re.DOTALL | re.MULTILINE
        )
        # Initialize EVTX parser if available
        self.evtx_parser = EvtxParser() if EVTX_SUPPORT else None
    
    def parse_log_file(self, file_path: str, user_id: str, system_name: str, session_timestamp: str) -> List[LogEntry]:
        """Parse a single log file and extract all events (supports both .log and .evtx formats)"""
        logger.debug(f'Parsing log file: {file_path}')
        
        # Check file extension and route to appropriate parser
        if file_path.lower().endswith('.evtx'):
            if self.evtx_parser:
                logger.debug(f'Using EVTX parser for {file_path}')
                return self.evtx_parser.parse_evtx_file(file_path, user_id, system_name, session_timestamp)
            else:
                logger.warning(f'EVTX format not supported for {file_path}. Install pyevtx: pip install libevtx-python')
                return []
        else:
            # Parse as text-based log file
            logger.debug(f'Using text parser for {file_path}')
            return self._parse_text_log_file(file_path, user_id, system_name, session_timestamp)
    
    def _parse_text_log_file(self, file_path: str, user_id: str, system_name: str, session_timestamp: str) -> List[LogEntry]:
        """Parse text-based log files (.log format)"""
        log_entries = []
        log_type = os.path.basename(file_path).replace(".log", "").replace(".txt", "")
        logger.debug(f'Parsing text log file: {file_path} (type: {log_type})')
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            logger.debug(f'Read {len(content)} characters from text log file')
            
            # Try actual format first (Time, Level, Source, Event ID, Category)
            matches = list(self.event_pattern_actual.finditer(content))
            logger.debug(f'Actual format pattern found {len(matches)} matches')
            
            # If no matches, try multi-line format
            if len(matches) == 0:
                matches = list(self.event_pattern_multiline.finditer(content))
                logger.debug(f'Multi-line format pattern found {len(matches)} matches')
                format_used = "multiline"
            else:
                format_used = "actual"
            
            # If still no matches, try single-line format
            if len(matches) == 0:
                matches = list(self.event_pattern_inline.finditer(content))
                logger.debug(f'Single-line format pattern found {len(matches)} matches')
                format_used = "inline"
            
            logger.debug(f'Using format: {format_used}')
            
            for match in matches:
                try:
                    groups = match.groups()
                    
                    if format_used == "actual":
                        # Groups: event_num, time, level, source, event_id, category, message
                        event_num = int(groups[0])
                        timestamp_str = (groups[1] or "").strip()
                        level = (groups[2] or "Information").strip()
                        source = (groups[3] or "Unknown").strip()
                        event_id = int(groups[4]) if groups[4] else 0
                        message = (groups[6] or "").strip()
                    else:
                        # For multiline and inline formats - need to handle differently
                        # Multiline: event_num, level, source, event_id, time, message
                        # Inline: event_num, level, source, event_id, time, message
                        event_num = int(groups[0])
                        if format_used == "actual":
                            timestamp_str = (groups[1] or "").strip()
                            level = (groups[2] or "Information").strip()
                        else:
                            level = (groups[1] or "Information").strip()
                            timestamp_str = (groups[4] if len(groups) > 4 else "").strip()
                        source = (groups[2] if len(groups) > 2 else "Unknown").strip()
                        event_id = int(groups[3]) if len(groups) > 3 and groups[3] else 0
                        message = (groups[5] if len(groups) > 5 else groups[-1] or "").strip()
                    
                    # Parse timestamp
                    timestamp = self._parse_timestamp(timestamp_str) if timestamp_str else datetime.now()
                    
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
                    logger.debug(f'Event {event_num} parsed: Level={level}, Source={source}')
                    
                except Exception as e:
                    logger.debug(f"Error parsing event in {file_path}: {e}", exc_info=True)
                    continue
                    
        except Exception as e:
            logger.error(f"Error reading text log file {file_path}: {e}", exc_info=True)
        
        logger.info(f'Text log file parsing complete: {len(log_entries)} entries extracted from {os.path.basename(file_path)}')
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
            logger.warning(f"Logs directory not found: {base_logs_dir}")
            print(f"Warning: Logs directory not found: {base_logs_dir}")
            return discovered
        
        logger.debug(f"Starting log discovery in: {base_logs_dir}")
        logger.debug(f"Base directory exists: {os.path.exists(base_logs_dir)}")
        logger.debug(f"Base directory is dir: {os.path.isdir(base_logs_dir)}")
        
        # Walk through userid/systemname/timestamp structure
        user_ids = os.listdir(base_logs_dir)
        logger.debug(f"Found {len(user_ids)} items in base directory: {user_ids}")
        
        for user_id in user_ids:
            user_path = os.path.join(base_logs_dir, user_id)
            logger.debug(f"Checking user_path: {user_path} (exists: {os.path.exists(user_path)}, isdir: {os.path.isdir(user_path)})")
            
            if not os.path.isdir(user_path):
                logger.debug(f"Skipping user_path (not a directory): {user_path}")
                continue
            
            system_names = os.listdir(user_path)
            logger.debug(f"User {user_id} has {len(system_names)} system entries: {system_names}")
            
            for system_name in system_names:
                system_path = os.path.join(user_path, system_name)
                logger.debug(f"Checking system_path: {system_path} (exists: {os.path.exists(system_path)}, isdir: {os.path.isdir(system_path)})")
                
                if not os.path.isdir(system_path):
                    logger.debug(f"Skipping system_path (not a directory): {system_path}")
                    continue
                
                session_timestamps = os.listdir(system_path)
                logger.debug(f"System {system_name} has {len(session_timestamps)} session entries: {session_timestamps}")
                
                for session_timestamp in session_timestamps:
                    session_path = os.path.join(system_path, session_timestamp)
                    logger.debug(f"Checking session_path: {session_path} (exists: {os.path.exists(session_path)}, isdir: {os.path.isdir(session_path)})")
                    
                    if not os.path.isdir(session_path):
                        logger.debug(f"Skipping session_path (not a directory): {session_path}")
                        continue
                    
                    logger.info(f"Found valid session: user={user_id}, system={system_name}, session={session_timestamp}, path={session_path}")
                    discovered.append((user_id, system_name, session_timestamp, session_path))
        
        logger.info(f"Log discovery complete: found {len(discovered)} valid sessions")
        return discovered
    
    def parse_all_logs(self, base_logs_dir: str, log_types: List[str]) -> List[LogEntry]:
        """Parse all logs from the directory structure (both .log text files and .evtx binary files)"""
        all_entries = []
        
        discovered_logs = self.discover_logs(base_logs_dir)
        logger.info(f"Discovered {len(discovered_logs)} log sessions")
        print(f"Discovered {len(discovered_logs)} log sessions")
        
        for user_id, system_name, session_timestamp, session_path in discovered_logs:
            logger.debug(f"Processing session: User={user_id}, System={system_name}, Session={session_timestamp}")
            logger.debug(f"Session path: {session_path}")
            logger.debug(f"Session path exists: {os.path.exists(session_path)}")
            logger.debug(f"Session path is dir: {os.path.isdir(session_path)}")
            
            print(f"Parsing logs for User: {user_id}, System: {system_name}, Session: {session_timestamp}")
            
            # First, parse configured log types (.log files)
            logger.debug(f"Looking for configured log types: {log_types}")
            for log_type in log_types:
                log_file_path = os.path.join(session_path, log_type)
                logger.debug(f"Checking for log file: {log_file_path}")
                logger.debug(f"  - Path string: {repr(log_file_path)}")
                logger.debug(f"  - Exists: {os.path.exists(log_file_path)}")
                logger.debug(f"  - Is file: {os.path.isfile(log_file_path)}")
                
                if os.path.exists(log_file_path):
                    logger.info(f"Found log file: {log_file_path}")
                    entries = self.parse_log_file(log_file_path, user_id, system_name, session_timestamp)
                    all_entries.extend(entries)
                    print(f"  - Parsed {len(entries)} entries from {log_type}")
                    logger.info(f"Parsed {len(entries)} entries from {log_type} in session {session_timestamp}")
                else:
                    logger.debug(f"Log file not found: {log_file_path}")
                    # List what files ARE in the directory
                    try:
                        session_files = os.listdir(session_path)
                        logger.debug(f"Files in session directory: {session_files}")
                    except Exception as e:
                        logger.error(f"Could not list session directory: {e}")
            
            # Also scan for any .evtx files in the session directory
            if os.path.isdir(session_path):
                logger.debug(f"Scanning {session_path} for EVTX files")
                try:
                    all_files = os.listdir(session_path)
                    logger.debug(f"Found {len(all_files)} files in session directory")
                    
                    for filename in all_files:
                        logger.debug(f"Checking file: {filename}")
                        if filename.lower().endswith('.evtx'):
                            evtx_file_path = os.path.join(session_path, filename)
                            logger.debug(f"Found EVTX file: {evtx_file_path}")
                            entries = self.parse_log_file(evtx_file_path, user_id, system_name, session_timestamp)
                            all_entries.extend(entries)
                            print(f"  - Parsed {len(entries)} entries from {filename} (EVTX)")
                            logger.info(f"Parsed {len(entries)} entries from {filename} (EVTX)")
                except Exception as e:
                    logger.error(f"Error scanning EVTX files in {session_path}: {e}", exc_info=True)
        
        logger.info(f"Total log parsing complete: {len(all_entries)} entries parsed from all sources")
        print(f"\nTotal entries parsed: {len(all_entries)}")
        return all_entries
