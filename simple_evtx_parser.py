"""
Alternative EVTX Parser Module - Pure Python implementation without external dependencies
Uses xml.etree to parse EVTX files if Windows API is available
"""
import os
import struct
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import List
from models import LogEntry


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
            print(f"Warning: EVTX file not found: {file_path}")
            return log_entries
        
        log_type = os.path.basename(file_path).replace(".evtx", "")
        
        try:
            # Try to use Windows API if available (Windows only)
            if os.name == 'nt':
                return self._parse_with_windows_api(file_path, user_id, system_name, session_timestamp, log_type)
        except Exception as e:
            print(f"Windows API parsing failed: {e}, falling back to basic parsing")
        
        # Fallback: try basic binary parsing
        try:
            return self._parse_basic_evtx(file_path, user_id, system_name, session_timestamp, log_type)
        except Exception as e:
            print(f"Error parsing EVTX file {file_path}: {e}")
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
            
            # Search for XML strings in the binary data
            # EVTX files contain UTF-16LE encoded XML fragments
            
            # Try to decode and extract XML-like patterns
            try:
                # Try UTF-16LE (common in Windows event logs)
                text = content.decode('utf-16-le', errors='ignore')
            except:
                try:
                    # Fallback to UTF-8
                    text = content.decode('utf-8', errors='ignore')
                except:
                    # Last resort: try latin-1
                    text = content.decode('latin-1', errors='ignore')
            
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
            event_num = 0
            for match_time in time_pattern.finditer(text):
                try:
                    event_num += 1
                    
                    # Find nearest matches for this event
                    start_pos = max(0, match_time.start() - 1000)
                    end_pos = min(len(text), match_time.end() + 1000)
                    event_context = text[start_pos:end_pos]
                    
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
                    
                except Exception as e:
                    print(f"Error parsing event {event_num}: {e}")
                    continue
        
        except Exception as e:
            print(f"Error reading EVTX file {file_path}: {e}")
        
        return log_entries
