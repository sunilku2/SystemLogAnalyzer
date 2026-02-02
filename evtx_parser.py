"""
EVTX Parser Module - Parses Windows Event Log (.evtx) files
Supports multiple parsing strategies:
1. pyevtx library (if installed)
2. Windows API (if on Windows)
3. Pure Python fallback parsing
"""
import os
import sys
import logging
from datetime import datetime
from typing import List
from models import LogEntry

logger = logging.getLogger('log_analyzer.parser')

# Try different EVTX parsing libraries in order of preference
PYEVTX_AVAILABLE = False
SIMPLE_PARSER_AVAILABLE = False

try:
    import pyevtx
    PYEVTX_AVAILABLE = True
except ImportError:
    pass

try:
    from simple_evtx_parser import SimpleEvtxParser
    SIMPLE_PARSER_AVAILABLE = True
except ImportError:
    pass


class EvtxParser:
    """
    Parses Windows Event Log (.evtx) binary files
    Automatically selects the best available parser
    """
    
    def __init__(self):
        self.pyevtx_available = PYEVTX_AVAILABLE
        self.simple_parser = None
        
        if SIMPLE_PARSER_AVAILABLE:
            self.simple_parser = SimpleEvtxParser()
        
        # Log available parsers
        if self.pyevtx_available:
            logger.info("[EVTX] pyevtx library available for parsing")
        elif self.simple_parser:
            logger.info("[EVTX] Using pure Python/Windows API fallback parser")
        else:
            logger.warning("[EVTX] Warning: No EVTX parsing available. Install pyevtx or ensure simple_evtx_parser is available")
    
    def parse_evtx_file(self, file_path: str, user_id: str, system_name: str, session_timestamp: str) -> List[LogEntry]:
        """Parse a single .evtx file and extract all events"""
        log_entries = []
        
        if not os.path.exists(file_path):
            logger.warning(f"EVTX file not found: {file_path}")
            return log_entries
        
        logger.info(f"EvtxParser.parse_evtx_file called for {os.path.basename(file_path)}")
        
        # Try pyevtx first if available
        if self.pyevtx_available:
            try:
                logger.info(f"Attempting pyevtx parsing for {os.path.basename(file_path)}")
                entries = self._parse_with_pyevtx(file_path, user_id, system_name, session_timestamp)
                logger.info(f"pyevtx successfully parsed {len(entries)} entries")
                return entries
            except Exception as e:
                logger.info(f"pyevtx parsing failed: {e}. Trying fallback parser...")
        
        # Fall back to simple parser
        if self.simple_parser:
            try:
                logger.info(f"Attempting simple parser for {os.path.basename(file_path)}")
                entries = self.simple_parser.parse_evtx_file(file_path, user_id, system_name, session_timestamp)
                logger.info(f"Simple parser returned {len(entries)} entries")
                return entries
            except Exception as e:
                logger.error(f"Simple parser failed: {e}", exc_info=True)
        
        logger.warning(f"Could not parse EVTX file {file_path}")
        return log_entries
    
    def _parse_with_pyevtx(self, file_path: str, user_id: str, system_name: str, session_timestamp: str) -> List[LogEntry]:
        """Parse using libevtx library (pyevtx)"""
        log_entries = []
        log_type = os.path.basename(file_path).replace(".evtx", "")
        
        try:
            # libevtx-python uses a different API
            evtx_file = pyevtx.file()
            evtx_file.open(file_path)
            
            if evtx_file is None:
                print(f"Error: Could not open EVTX file {file_path}")
                return log_entries
            
            # Iterate through all records
            number_of_records = evtx_file.number_of_records
            for record_index in range(number_of_records):
                try:
                    record = evtx_file.get_record(record_index)
                    
                    # Extract event information
                    event_id = self._get_event_id(record)
                    level = self._get_level(record)
                    source = self._get_source(record)
                    timestamp = self._get_timestamp(record)
                    message = self._get_message(record)
                    
                    log_entry = LogEntry(
                        event_number=record_index,
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
                    print(f"Error parsing event {record_index} in {file_path}: {e}")
                    continue
            
            evtx_file.close()
            
        except Exception as e:
            print(f"Error reading EVTX file {file_path}: {e}")
        
        return log_entries
    
    def _get_event_id(self, record) -> int:
        """Extract Event ID from record"""
        try:
            # Try to get from XML data
            xml_string = record.xml_string
            # Parse Event ID from XML: <EventID>4042</EventID>
            import re
            match = re.search(r'<EventID>(\d+)</EventID>', xml_string, re.IGNORECASE)
            if match:
                return int(match.group(1))
            return 0
        except:
            return 0
    
    def _get_level(self, record) -> str:
        """Extract Event Level from record"""
        try:
            xml_string = record.xml_string
            # Parse Level from XML: <Level>2</Level> or <Level>Error</Level>
            import re
            
            # Try numeric level first
            match = re.search(r'<Level>(\d+)</Level>', xml_string, re.IGNORECASE)
            if match:
                level_num = int(match.group(1))
                level_map = {
                    1: "Critical",
                    2: "Error",
                    3: "Warning",
                    4: "Information",
                    5: "Verbose"
                }
                return level_map.get(level_num, "Information")
            
            # Try text level
            match = re.search(r'<Level>(\w+)</Level>', xml_string, re.IGNORECASE)
            if match:
                return match.group(1)
            
            return "Information"
        except:
            return "Information"
    
    def _get_source(self, record) -> str:
        """Extract Source/Provider from record"""
        try:
            xml_string = record.xml_string
            # Parse Provider from XML: <Provider Name="Microsoft-Windows-NCSI" ... />
            import re
            match = re.search(r'<Provider\s+[^>]*Name="([^"]+)"', xml_string, re.IGNORECASE)
            if match:
                return match.group(1)
            
            # Fallback to Channel
            match = re.search(r'<Channel>([^<]+)</Channel>', xml_string, re.IGNORECASE)
            if match:
                return match.group(1)
            
            return "Unknown"
        except:
            return "Unknown"
    
    def _get_timestamp(self, record) -> datetime:
        """Extract timestamp from record"""
        try:
            xml_string = record.xml_string
            # Parse SystemTime from XML: <SystemTime>2024-01-15T10:30:45.123456Z</SystemTime>
            import re
            match = re.search(r'<SystemTime>([^<]+)</SystemTime>', xml_string, re.IGNORECASE)
            if match:
                timestamp_str = match.group(1)
                # Parse ISO 8601 format: 2024-01-15T10:30:45.123456Z
                try:
                    return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                except:
                    # Fallback to simpler parsing
                    return datetime.strptime(timestamp_str[:19], "%Y-%m-%dT%H:%M:%S")
            
            return datetime.now()
        except:
            return datetime.now()
    
    def _get_message(self, record) -> str:
        """Extract message from record"""
        try:
            xml_string = record.xml_string
            
            # Try to get EventData values first
            import re
            message_parts = []
            
            # Extract Data elements with Name attribute
            data_matches = re.findall(r'<Data\s+Name="([^"]+)">([^<]*)</Data>', xml_string, re.IGNORECASE)
            if data_matches:
                for name, value in data_matches:
                    if value:
                        message_parts.append(f"{name}: {value}")
            
            # Also try unnamed Data elements
            data_matches = re.findall(r'<Data>([^<]+)</Data>', xml_string, re.IGNORECASE)
            for value in data_matches:
                if value and value not in [part.split(": ")[1] for part in message_parts]:
                    message_parts.append(value)
            
            if message_parts:
                return " | ".join(message_parts)
            
            # Fallback to full XML if no structured data
            return xml_string[:500]  # First 500 chars
        except:
            return "Unable to parse message"
