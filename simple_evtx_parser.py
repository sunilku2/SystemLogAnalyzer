"""
Alternative EVTX Parser Module - Pure Python implementation without external dependencies
Uses xml.etree to parse EVTX files if Windows API is available
"""
import os
import struct
import xml.etree.ElementTree as ET
import logging
from datetime import datetime
from typing import List
from models import LogEntry

logger = logging.getLogger('log_analyzer.parser')


class SimpleEvtxParser:
    """
    Simple EVTX parser for Windows Event Log binary files.
    This is a lightweight implementation that may not parse all EVTX files perfectly,
    but provides basic functionality without external dependencies.
    """
    
    def __init__(self):
        self.available = True
    
    def parse_evtx_file(self, file_path: str, user_id: str, system_name: str, session_timestamp: str) -> List[LogEntry]:
        """
        Parse a single .evtx file and extract events using Windows API if available
        Falls back to basic parsing otherwise
        """
        log_entries = []
        
        if not os.path.exists(file_path):
            logger.warning(f"EVTX file not found: {file_path}")
            return log_entries
        
        file_size = os.path.getsize(file_path)
        logger.info(f"Parsing EVTX file: {file_path} (size: {file_size} bytes)")
        
        log_type = os.path.basename(file_path).replace(".evtx", "")
        
        try:
            # Try to use Windows API if available (Windows only)
            if os.name == 'nt':
                logger.info(f"Attempting Windows API parsing for {os.path.basename(file_path)}")
                entries = self._parse_with_windows_api(file_path, user_id, system_name, session_timestamp, log_type)
                if entries:
                    logger.info(f"Windows API successfully parsed {len(entries)} events from {os.path.basename(file_path)}")
                    return entries
                logger.info(f"Windows API returned 0 entries, trying fallback")
        except Exception as e:
            logger.info(f"Windows API parsing failed: {e}, falling back to basic parsing")
        
        # Fallback: try basic binary parsing
        try:
            logger.info(f"Using basic binary parsing for {os.path.basename(file_path)}")
            entries = self._parse_basic_evtx(file_path, user_id, system_name, session_timestamp, log_type)
            logger.info(f"Basic parser extracted {len(entries)} events from {os.path.basename(file_path)}")
            return entries
        except Exception as e:
            logger.error(f"Error parsing EVTX file {file_path}: {e}", exc_info=True)
            return log_entries
    
    def _parse_with_windows_api(self, file_path: str, user_id: str, system_name: str, session_timestamp: str, log_type: str) -> List[LogEntry]:
        """Parse using Windows API (Windows only)"""
        log_entries = []
        
        try:
            import win32evtlog
            import win32api
            
            # Map log file name to Windows event log name
            log_name_map = {
                'System': 'System',
                'Application': 'Application',
                'Network': 'System',
                'network_ncsi': 'System',
                'network_wlan': 'System',
                'Driver': 'System'
            }
            
            win_log_name = log_name_map.get(log_type.replace('.evtx', ''), 'System')
            
            # Open the event log
            handle = win32evtlog.OpenEventLog(None, win_log_name)
            flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ
            
            # Read events from the file instead of the log
            events = win32evtlog.ReadEventLog(handle, flags, 0)
            
            for event in events:
                try:
                    event_id = event[1]  # EventID
                    level_num = event[8]  # EventType
                    source = event[0]  # Source
                    timestamp_struct = event[9]  # TimeGenerated
                    message = event[10] if len(event) > 10 else ""
                    
                    # Map event type to level
                    level_map = {
                        1: "Error",      # EVENTLOG_ERROR_TYPE
                        2: "Warning",    # EVENTLOG_WARNING_TYPE
                        4: "Information" # EVENTLOG_INFORMATION_TYPE
                    }
                    level = level_map.get(level_num, "Information")
                    
                    # Parse timestamp
                    if isinstance(timestamp_struct, (list, tuple)):
                        timestamp = datetime(*timestamp_struct[:6])
                    else:
                        timestamp = datetime.now()
                    
                    log_entry = LogEntry(
                        event_number=len(log_entries),
                        level=level,
                        source=source,
                        event_id=event_id,
                        timestamp=timestamp,
                        message=str(message),
                        log_type=log_type,
                        user_id=user_id,
                        system_name=system_name,
                        session_timestamp=session_timestamp
                    )
                    log_entries.append(log_entry)
                except Exception as e:
                    print(f"Error parsing event: {e}")
                    continue
            
            win32evtlog.CloseEventLog(handle)
            
        except ImportError:
            raise ImportError("pywin32 not available for Windows API parsing")
        
        return log_entries
    
    def _parse_basic_evtx(self, file_path: str, user_id: str, system_name: str, session_timestamp: str, log_type: str) -> List[LogEntry]:
        """
        Basic EVTX parsing by searching for XML markers
        EVTX files contain XML-formatted event data
        """
        log_entries = []
        
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            
            logger.info(f"Read {len(content)} bytes from {os.path.basename(file_path)}")
            
            # Search for XML strings in the binary data
            # EVTX files contain UTF-16LE encoded XML fragments
            
            # Try to decode and extract XML-like patterns
            text = None
            encoding_used = None
            try:
                # Try UTF-16LE (common in Windows event logs)
                text = content.decode('utf-16-le', errors='ignore')
                encoding_used = 'utf-16-le'
            except:
                try:
                    # Fallback to UTF-8
                    text = content.decode('utf-8', errors='ignore')
                    encoding_used = 'utf-8'
                except:
                    # Last resort: try latin-1
                    text = content.decode('latin-1', errors='ignore')
                    encoding_used = 'latin-1'
            
            logger.info(f"Decoded file using {encoding_used} encoding, result length: {len(text) if text else 0} characters")
            
            # Extract text content between common markers
            # This is a very basic extraction
            import re
            
            # Look for Event ID patterns
            event_pattern = re.compile(r'<EventID>(\d+)</EventID>', re.IGNORECASE)
            level_pattern = re.compile(r'<Level>(\d+|Critical|Error|Warning|Information|Verbose)</Level>', re.IGNORECASE)
            provider_pattern = re.compile(r'<Provider\s+[^>]*Name="([^"]+)"', re.IGNORECASE)
            time_pattern = re.compile(r'<SystemTime>([^<]+)</SystemTime>', re.IGNORECASE)
            
            # Split by Event-like markers
            # This is very approximate and may not work for all EVTX files
            time_matches = list(time_pattern.finditer(text))
            logger.info(f"Found {len(time_matches)} SystemTime patterns in decoded text")
            
            if len(time_matches) == 0:
                # Try alternative markers if SystemTime not found
                logger.info(f"No SystemTime found, searching for alternative patterns")
                # Look for Event elements as fallback
                event_elem_pattern = re.compile(r'<Event[^>]*>.*?</Event>', re.IGNORECASE | re.DOTALL)
                alt_matches = list(event_elem_pattern.finditer(text))
                logger.info(f"Found {len(alt_matches)} alternative Event element patterns")
                if alt_matches:
                    time_matches = alt_matches
            
            event_num = 0
            for match_time in time_matches:
                try:
                    event_num += 1
                    
                    # For alternative matches, use the whole match as context
                    if hasattr(match_time, 'group') and '<Event' in match_time.group():
                        event_context = match_time.group()
                    else:
                        # Find nearest matches for this event
                        start_pos = max(0, match_time.start() - 1000)
                        end_pos = min(len(text), match_time.end() + 1000)
                        event_context = text[start_pos:end_pos]
                    
                    logger.info(f"Processing event {event_num}, context length: {len(event_context)} chars")
                    
                    # Extract fields
                    event_id_match = event_pattern.search(event_context)
                    event_id = int(event_id_match.group(1)) if event_id_match else 0
                    
                    level_match = level_pattern.search(event_context)
                    if level_match:
                        level_val = level_match.group(1)
                        # Map numeric levels
                        if level_val.isdigit():
                            level_map = {'1': 'Critical', '2': 'Error', '3': 'Warning', '4': 'Information', '5': 'Verbose'}
                            level = level_map.get(level_val, 'Information')
                        else:
                            level = level_val
                    else:
                        level = 'Information'
                    
                    provider_match = provider_pattern.search(event_context)
                    source = provider_match.group(1) if provider_match else 'Unknown'
                    
                    timestamp_str = match_time.group(1)
                    try:
                        # Parse ISO 8601 format
                        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    except:
                        try:
                            timestamp = datetime.strptime(timestamp_str[:19], "%Y-%m-%dT%H:%M:%S")
                        except:
                            timestamp = datetime.now()
                    
                    # Extract message from Data fields
                    data_pattern = re.compile(r'<Data[^>]*>([^<]+)</Data>', re.IGNORECASE)
                    data_matches = data_pattern.findall(event_context)
                    message = ' | '.join(data_matches[:5]) if data_matches else 'Event data available'
                    
                    log_entry = LogEntry(
                        event_number=event_num,
                        level=level,
                        source=source,
                        event_id=event_id,
                        timestamp=timestamp,
                        message=message[:500],  # Limit message length
                        log_type=log_type,
                        user_id=user_id,
                        system_name=system_name,
                        session_timestamp=session_timestamp
                    )
                    log_entries.append(log_entry)
                    logger.info(f"Event {event_num} parsed: ID={event_id}, Level={level}, Source={source}")
                    
                except Exception as e:
                    logger.info(f"Error parsing event {event_num}: {e}", exc_info=True)
                    continue
        
        except Exception as e:
            logger.error(f"Error reading EVTX file {file_path}: {e}", exc_info=True)
        
        logger.info(f"Completed basic parsing: extracted {len(log_entries)} total events from {os.path.basename(file_path)}")
        return log_entries
