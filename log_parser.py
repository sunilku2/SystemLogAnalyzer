"""
Log Parser Module - Parses various Windows Event Logs (both .log text files and .evtx binary files)
"""
import os
import re
import logging
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from models import LogEntry
from config import NETWORK_ANALYSIS_ONLY, NETWORK_LOG_KEYWORDS

logger = logging.getLogger('log_analyzer.parser')

# Try to import EVTX parser (optional dependency)
try:
    from evtx_parser import EvtxParser
    EVTX_SUPPORT = True
    logger.info('EVTX support enabled')
except ImportError:
    EVTX_SUPPORT = False
    EvtxParser = None
    logger.info('EVTX support not available')


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
        self.session_timestamp_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$")
    
    def parse_log_file(self, file_path: str, user_id: str, system_name: str, session_timestamp: str) -> List[LogEntry]:
        """Parse a single log file and extract all events (supports both .log and .evtx formats)"""
        logger.info(f'Parsing log file: {file_path}')
        
        # Check file extension and route to appropriate parser
        if file_path.lower().endswith('.evtx'):
            if self.evtx_parser:
                logger.info(f'Using EVTX parser for {file_path}')
                return self.evtx_parser.parse_evtx_file(file_path, user_id, system_name, session_timestamp)
            else:
                logger.warning(f'EVTX format not supported for {file_path}. Install pyevtx: pip install libevtx-python')
                return []
        else:
            # Parse as text-based log file
            logger.info(f'Using text parser for {file_path}')
            return self._parse_text_log_file(file_path, user_id, system_name, session_timestamp)
    
    def _parse_text_log_file(self, file_path: str, user_id: str, system_name: str, session_timestamp: str) -> List[LogEntry]:
        """Parse text-based log files (.log format)"""
        log_entries = []
        log_type = os.path.basename(file_path).replace(".log", "").replace(".txt", "")
        logger.info(f'Parsing text log file: {file_path} (type: {log_type})')
        
        try:
            logger.info(f'Reading log file: {file_path}')
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            logger.info(f'Read {len(content)} characters from text log file')
            
            # Try actual format first (Time, Level, Source, Event ID, Category)
            matches = list(self.event_pattern_actual.finditer(content))
            logger.info(f'Actual format pattern found {len(matches)} matches')
            
            # If no matches, try multi-line format
            if len(matches) == 0:
                matches = list(self.event_pattern_multiline.finditer(content))
                logger.info(f'Multi-line format pattern found {len(matches)} matches')
                format_used = "multiline"
            else:
                format_used = "actual"
            
            # If still no matches, try single-line format
            if len(matches) == 0:
                matches = list(self.event_pattern_inline.finditer(content))
                logger.info(f'Single-line format pattern found {len(matches)} matches')
                format_used = "inline"
            
            logger.info(f'Using format: {format_used}')
            
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
                        level = ((groups[1] if len(groups) > 1 else None) or "Information").strip()
                        timestamp_str = ((groups[4] if len(groups) > 4 else None) or "").strip()
                        source = ((groups[2] if len(groups) > 2 else None) or "Unknown").strip()
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
                    logger.info(f'Event {event_num} parsed: Level={level}, Source={source}')
                    
                except Exception as e:
                    logger.info(f"Error parsing event in {file_path}: {e}", exc_info=True)
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

    def _is_supported_log_filename(self, filename: str, configured_log_types: Optional[List[str]] = None) -> bool:
        """Return True if a filename should be parsed as a log file."""
        lower_name = filename.lower()

        if lower_name in {'index.txt'}:
            return False

        if lower_name.endswith('_analysis.log') or lower_name.endswith('_analysis.txt'):
            return False

        if NETWORK_ANALYSIS_ONLY:
            if configured_log_types and filename in configured_log_types:
                return True

            if any(keyword in lower_name for keyword in NETWORK_LOG_KEYWORDS):
                return lower_name.endswith('.log') or lower_name.endswith('.txt') or lower_name.endswith('.evtx')

            return False

        if configured_log_types and filename in configured_log_types:
            return True

        if lower_name.endswith('.evtx') or lower_name.endswith('.log'):
            return True

        # Include text logs that follow the common *_log*.txt naming pattern
        if lower_name.endswith('.txt') and 'log' in lower_name:
            return True

        return False

    def _find_log_files_in_directory(self, directory_path: str, configured_log_types: Optional[List[str]] = None) -> List[str]:
        """Return all parsable log filenames in a directory."""
        try:
            files = os.listdir(directory_path)
        except Exception as e:
            logger.error(f"Could not list directory {directory_path}: {e}")
            return []

        log_files = [
            file_name
            for file_name in files
            if os.path.isfile(os.path.join(directory_path, file_name))
            and self._is_supported_log_filename(file_name, configured_log_types)
        ]

        return sorted(set(log_files))

    def _extract_session_metadata(self, relative_parts: List[str]) -> Tuple[str, str, str]:
        """Infer user/system/session metadata from a relative path."""
        user_id = relative_parts[0] if len(relative_parts) >= 1 else "unknown-user"

        system_name = "unknown-system"
        for part in relative_parts:
            if part.lower().startswith("soc-"):
                system_name = part
                break

        if system_name == "unknown-system" and len(relative_parts) >= 2:
            system_name = relative_parts[1]

        session_timestamp = "current"
        for part in reversed(relative_parts):
            if self.session_timestamp_pattern.match(part):
                session_timestamp = part
                break

        if session_timestamp == "current" and len(relative_parts) >= 3:
            session_timestamp = relative_parts[-1]

        return user_id, system_name, session_timestamp
    
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

        seen_paths = set()
        for current_dir, _subdirs, _files in os.walk(base_logs_dir):
            if current_dir == base_logs_dir:
                continue

            log_files = self._find_log_files_in_directory(current_dir)
            if not log_files:
                continue

            relative_path = os.path.relpath(current_dir, base_logs_dir)
            relative_parts = [part for part in relative_path.split(os.sep) if part and part != '.']
            user_id, system_name, session_timestamp = self._extract_session_metadata(relative_parts)

            normalized_path = os.path.normpath(current_dir)
            if normalized_path in seen_paths:
                continue

            seen_paths.add(normalized_path)
            logger.info(
                f"Found valid session: user={user_id}, system={system_name}, "
                f"session={session_timestamp}, path={current_dir}, files={len(log_files)}"
            )
            discovered.append((user_id, system_name, session_timestamp, current_dir))
        
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
            
            session_log_files = self._find_log_files_in_directory(session_path, configured_log_types=log_types)
            if not session_log_files:
                logger.debug(f"No supported log files found in {session_path}")
                continue

            logger.debug(f"Found {len(session_log_files)} supported log files in session directory: {session_log_files}")
            for filename in session_log_files:
                log_file_path = os.path.join(session_path, filename)
                entries = self.parse_log_file(log_file_path, user_id, system_name, session_timestamp)
                all_entries.extend(entries)
                print(f"  - Parsed {len(entries)} entries from {filename}")
                logger.info(f"Parsed {len(entries)} entries from {filename} in session {session_timestamp}")
        
        logger.info(f"Total log parsing complete: {len(all_entries)} entries parsed from all sources")
        print(f"\nTotal entries parsed: {len(all_entries)}")
        return all_entries
