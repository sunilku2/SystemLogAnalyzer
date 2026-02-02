"""
Issue Detection Module - Identifies and categorizes issues from log entries
"""
import re
import hashlib
import logging
from typing import List, Dict
from collections import defaultdict
from difflib import SequenceMatcher
from models import LogEntry, Issue

logger = logging.getLogger('log_analyzer.detector')


class IssueDetector:
    """Detects and categorizes issues from log entries"""
    
    def __init__(self, similarity_threshold: float = 0.7):
        self.similarity_threshold = similarity_threshold
        self.issue_patterns = self._load_issue_patterns()
    
    def _load_issue_patterns(self) -> List[Dict]:
        """
        Define patterns for known issues with root causes and solutions
        This can be extended or loaded from a database in the future
        """
        return [
            # Network Connectivity Patterns (based on NetworkConnectivity-Analysis-Instructions.md)
            {
                "category": "Network Connectivity",
                "pattern": r"event id 4042|ncsi|capability.*change|media disconnect",
                "severity": "Error",
                "keywords": ["network", "ncsi", "connectivity", "capability", "media disconnect"],
                "root_cause": "Network capability changed or media disconnection detected. This indicates the device lost connectivity, possibly due to wireless signal issues, network adapter problems, or media disconnect events.",
                "solution": "Check network adapter status in Device Manager, update network drivers, verify WiFi signal strength, restart network adapter or check physical network connection"
            },
            {
                "category": "Network Connectivity",
                "pattern": r"event id 4006|no.*network.*connectivity|connectivity.*lost",
                "severity": "Critical",
                "keywords": ["network", "no connectivity", "disconnected", "internet"],
                "root_cause": "Network connectivity completely lost. NCSI (Network Connectivity Status Indicator) detected no network access, indicating either no physical connection or complete network isolation.",
                "solution": "Verify physical network connection, check network adapter hardware, restart network adapter, run network troubleshooter, verify network configuration and IP settings"
            },
            {
                "category": "Network Connectivity",
                "pattern": r"event id 4005|local.*network.*only|limited.*network",
                "severity": "Warning",
                "keywords": ["local network", "limited connectivity", "no internet"],
                "root_cause": "Device has local network connectivity but no internet access. DNS probes are failing or the gateway is unreachable, preventing internet connectivity.",
                "solution": "Check DNS settings (try 8.8.8.8 or 1.1.1.1), verify gateway is reachable, check ISP connection, test DNS resolution with nslookup, restart modem/router"
            },
            {
                "category": "Network Connectivity",
                "pattern": r"event id 4003|captive portal|hotspot.*detected",
                "severity": "Warning",
                "keywords": ["captive portal", "hotspot", "authentication required"],
                "root_cause": "Device detected a captive portal network (like hotel WiFi, airport WiFi, or public hotspot) requiring authentication. HTTP probe failed due to redirection to login page.",
                "solution": "Open web browser to authenticate with captive portal, accept terms of service, verify WiFi SSID is correct, check for proxy requirements"
            },
            {
                "category": "Network Connectivity",
                "pattern": r"event id 507|exit.*standby|wake.*sleep|resume.*hibernation",
                "severity": "Warning",
                "keywords": ["wake from standby", "resume", "sleep", "connected standby"],
                "root_cause": "Device waking from sleep/standby. Network connectivity may be temporarily unavailable during resume as network adapters reinitialize.",
                "solution": "Wait 10-15 seconds for network adapter to reinitialize after wake, check network adapter power management settings, disable selective suspend for network adapter in Power Options"
            },
            {
                "category": "Network Connectivity",
                "pattern": r"event id 8002|wlan.*autoconnect.*fail|wireless.*connect.*fail",
                "severity": "Error",
                "keywords": ["wlan", "autoconnect", "wireless", "wifi", "connection fail"],
                "root_cause": "Wireless auto-connect failed. The device attempted to automatically connect to a configured WiFi network but the connection failed, possibly due to authentication, network unavailability, or profile issues.",
                "solution": "Verify WiFi network is broadcasting SSID, check WiFi password, remove and re-add WiFi profile, update wireless adapter driver, restart WiFi adapter"
            },
            {
                "category": "Network Connectivity",
                "pattern": r"event id 11006|wlan.*security.*fail|wifi.*authentication.*fail|security.*error",
                "severity": "Error",
                "keywords": ["wlan security", "authentication", "wifi password", "802.1x", "eap"],
                "root_cause": "WiFi security authentication failed. The device failed to establish a secure connection to the WiFi network due to incorrect credentials, security protocol mismatch, certificate issues, or 802.1X/EAP failures.",
                "solution": "Verify WiFi password is correct, check security type matches network settings (WPA2 vs WPA3), update wireless driver, remove expired certificates, check RADIUS server if using 802.1X"
            },
            {
                "category": "Network Connectivity",
                "pattern": r"dns.*fail|dns.*resolv|activehttp.*probe.*fail",
                "severity": "Error",
                "keywords": ["dns", "resolution", "probe failed", "msftconnecttest"],
                "root_cause": "DNS resolution failed or HTTP connectivity probe failed. Network connectivity tests are unable to reach internet services, indicating DNS issues or network path problems.",
                "solution": "Test DNS resolution (nslookup google.com), change DNS servers to 8.8.8.8 or 1.1.1.1, flush DNS cache (ipconfig /flushdns), check proxy settings, verify firewall allows DNS/HTTP"
            },
            {
                "category": "Network Connectivity",
                "pattern": r"arp.*fail|gateway.*unreachable|l2.*reachability",
                "severity": "Error",
                "keywords": ["arp", "gateway", "layer 2", "reachability", "duplicate ip"],
                "root_cause": "Layer 2 (ARP) probe failed indicating reachability issues with gateway or next hop. This suggests WiFi instability, duplicate IP addresses, or network infrastructure problems.",
                "solution": "Check WiFi signal strength and roaming, release and renew IP address (ipconfig /release /renew), check for duplicate IP addresses on network, restart WiFi router, check for WiFi interference"
            },

            # Original patterns (non-network specific)
            {
                "category": "Service Management",
                "pattern": r"start type.*service.*changed",
                "severity": "Warning",
                "keywords": ["service", "start type", "changed"],
                "root_cause": "Windows service configuration is being frequently modified, possibly by system updates or third-party software",
                "solution": "Review service dependencies and check for conflicting software that may be changing service configurations"
            },
            {
                "category": "Disk Issues",
                "pattern": r"disk.*error|bad.*sector|read.*fail|write.*fail",
                "severity": "Critical",
                "keywords": ["disk", "error", "bad", "sector", "read fail", "write fail"],
                "root_cause": "Hard disk showing signs of failure or file system corruption",
                "solution": "Run CHKDSK utility, backup critical data immediately, consider disk replacement if errors persist"
            },
            {
                "category": "Application Crash",
                "pattern": r"application.*crash|application.*fault|exception.*0x",
                "severity": "Error",
                "keywords": ["crash", "fault", "exception", "terminated unexpectedly"],
                "root_cause": "Application encountering unhandled exceptions or memory access violations",
                "solution": "Update application to latest version, check for compatibility issues, review application logs for specific error codes"
            },
            {
                "category": "Driver Issues",
                "pattern": r"driver.*fail|driver.*not.*load|device.*not.*start",
                "severity": "Error",
                "keywords": ["driver", "fail", "not load", "device", "not start"],
                "root_cause": "Device driver incompatibility or corruption preventing proper device initialization",
                "solution": "Update or reinstall device drivers, check Device Manager for conflicts, verify driver digital signature"
            },
            {
                "category": "Memory Issues",
                "pattern": r"out of memory|memory.*corrupt|page fault|insufficient.*memory",
                "severity": "Critical",
                "keywords": ["out of memory", "memory corrupt", "page fault", "insufficient memory"],
                "root_cause": "System running low on available memory or experiencing memory corruption",
                "solution": "Close unnecessary applications, add more RAM, run Windows Memory Diagnostic tool, check for memory leaks"
            },
            {
                "category": "Security/Authentication",
                "pattern": r"login.*fail|authentication.*fail|access.*denied|credential.*invalid",
                "severity": "Warning",
                "keywords": ["login fail", "authentication fail", "access denied", "credential invalid"],
                "root_cause": "User authentication failures or permission issues",
                "solution": "Verify user credentials, check account lockout policies, review access permissions, reset password if needed"
            },
            {
                "category": "System Performance",
                "pattern": r"timeout|response.*slow|high.*cpu|performance.*degrad",
                "severity": "Warning",
                "keywords": ["timeout", "slow", "high cpu", "performance", "degrad"],
                "root_cause": "System experiencing performance bottlenecks or resource exhaustion",
                "solution": "Check Task Manager for resource usage, disable startup programs, scan for malware, optimize system settings"
            },
            {
                "category": "Windows Update",
                "pattern": r"update.*fail|installation.*fail|windows update",
                "severity": "Warning",
                "keywords": ["update fail", "installation fail", "windows update"],
                "root_cause": "Windows Update service experiencing issues or insufficient disk space",
                "solution": "Run Windows Update Troubleshooter, clear Software Distribution folder, ensure sufficient disk space"
            },
            {
                "category": "Event Description Missing",
                "pattern": r"description.*Event ID.*could not be found",
                "severity": "Information",
                "keywords": ["description", "could not be found"],
                "root_cause": "Event message DLL not registered or missing for the event source",
                "solution": "This is typically informational and doesn't indicate a problem. The event data is still recorded."
            }
        ]
    
    def detect_issues(self, log_entries: List[LogEntry]) -> List[Issue]:
        """Detect and group issues from log entries"""
        logger.info(f'Starting issue detection on {len(log_entries)} log entries')
        
        # Filter for warnings, errors, and critical entries
        significant_entries = [
            entry for entry in log_entries 
            if entry.level in ["Warning", "Error", "Critical"]
        ]
        
        logger.info(f'Found {len(significant_entries)} significant entries (Warning/Error/Critical)')
        
        # Group similar issues
        issue_groups = defaultdict(list)
        
        for entry in significant_entries:
            issue_signature = self._get_issue_signature(entry)
            issue_groups[issue_signature].append(entry)
        
        logger.info(f'Grouped entries into {len(issue_groups)} unique issue signatures')
        
        # Create Issue objects
        issues = []
        for signature, entries in issue_groups.items():
            issue = self._create_issue_from_entries(signature, entries)
            if issue:
                issues.append(issue)
                logger.info(f'Created issue: category={issue.category}, severity={issue.severity}, count={len(entries)}')
        return issues
    
    def _get_issue_signature(self, entry: LogEntry) -> str:
        """Generate a signature for an issue to group similar issues"""
        # Normalize message: remove timestamps, specific IDs, paths
        normalized = entry.message.lower()
        
        # Remove specific numbers, paths, timestamps
        normalized = re.sub(r'\d{4}-\d{2}-\d{2}', '<date>', normalized)
        normalized = re.sub(r'\d{2}:\d{2}:\d{2}', '<time>', normalized)
        normalized = re.sub(r'0x[0-9a-f]+', '<hex>', normalized)
        normalized = re.sub(r'\d+', '<num>', normalized)
        normalized = re.sub(r'[a-z]:\\[^\s]+', '<path>', normalized, flags=re.IGNORECASE)
        
        # Create signature from event ID, source, and normalized message
        signature_parts = [
            str(entry.event_id),
            entry.source.lower().strip(),
            entry.level.lower(),
            normalized[:200]  # First 200 chars of normalized message
        ]
        
        signature = "|".join(signature_parts)
        return hashlib.md5(signature.encode()).hexdigest()
    
    def _create_issue_from_entries(self, signature: str, entries: List[LogEntry]) -> Issue:
        """Create an Issue object from grouped log entries"""
        if not entries:
            return None
        
        # Use first entry as representative
        first_entry = entries[0]
        
        # Determine category and get root cause/solution
        category, root_cause, solution, severity = self._categorize_issue(first_entry)
        
        # Collect affected users and systems
        affected_users = list(set(entry.user_id for entry in entries))
        affected_systems = list(set(entry.system_name for entry in entries))
        
        # Create descriptive issue title
        description = self._generate_issue_description(first_entry)
        
        issue = Issue(
            issue_id=signature[:8],
            category=category,
            severity=severity or first_entry.level,
            description=description,
            pattern=f"Event ID: {first_entry.event_id}, Source: {first_entry.source}",
            affected_users=affected_users,
            affected_systems=affected_systems,
            occurrences=len(entries),
            log_entries=entries,
            root_cause=root_cause,
            solution=solution
        )
        
        return issue
    
    def _categorize_issue(self, entry: LogEntry) -> tuple:
        """Categorize issue based on patterns and return (category, root_cause, solution, severity)"""
        message_lower = entry.message.lower()
        source_lower = entry.source.lower()
        log_type_lower = entry.log_type.lower()
        
        # Check against known patterns
        for pattern_def in self.issue_patterns:
            # Check pattern against message
            if re.search(pattern_def["pattern"], message_lower, re.IGNORECASE):
                return (
                    pattern_def["category"],
                    pattern_def["root_cause"],
                    pattern_def["solution"],
                    pattern_def.get("severity")
                )
            
            # Check keywords in message
            keyword_matches = sum(1 for kw in pattern_def["keywords"] if kw.lower() in message_lower)
            if keyword_matches >= 2:  # At least 2 keywords match
                return (
                    pattern_def["category"],
                    pattern_def["root_cause"],
                    pattern_def["solution"],
                    pattern_def.get("severity")
                )
            
            # Also check event ID and source for network patterns
            event_pattern = r'(\d+)'
            event_match = re.search(event_pattern, str(entry.event_id))
            if event_match:
                event_id_str = event_match.group(1)
                pattern_str = pattern_def["pattern"]
                # Check if pattern mentions specific event IDs
                if f"event id {event_id_str}" in pattern_str:
                    return (
                        pattern_def["category"],
                        pattern_def["root_cause"],
                        pattern_def["solution"],
                        pattern_def.get("severity")
                    )
            
            # Check keywords in source/log_type
            keyword_matches_source = sum(1 for kw in pattern_def["keywords"] 
                                        if kw.lower() in source_lower or kw.lower() in log_type_lower)
            if keyword_matches_source >= 2:
                return (
                    pattern_def["category"],
                    pattern_def["root_cause"],
                    pattern_def["solution"],
                    pattern_def.get("severity")
                )
        
        # Default categorization based on log type and source
        category_map = {
            "System": "System Configuration",
            "Application": "Application Issue",
            "Network": "Network Issue",
            "Driver": "Driver Issue",
            "Security": "Security Issue",
            "wlan": "Network Connectivity",
            "ncsi": "Network Connectivity",
            "kernel-power": "System Issues",
            "dns": "Network Connectivity"
        }
        
        # Check log_type and source for clues
        for key, category in category_map.items():
            if key.lower() in log_type_lower or key.lower() in source_lower:
                category_map_category = category
                break
        else:
            category_map_category = category_map.get(entry.log_type, "Uncategorized")
        
        root_cause = "Issue requires further investigation based on event details and system context"
        solution = "Review detailed event information, check related system logs, consult vendor documentation for specific event ID"
        
        return category_map_category, root_cause, solution, None
    
    def _generate_issue_description(self, entry: LogEntry) -> str:
        """Generate a concise description for the issue"""
        # Truncate message if too long
        message = entry.message
        if len(message) > 150:
            message = message[:150] + "..."
        
        return f"{entry.log_type} - {entry.source}: {message}"
