"""
Data models for log analysis
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime


@dataclass
class LogEntry:
    """Represents a single log entry"""
    event_number: int
    level: str
    source: str
    event_id: int
    timestamp: datetime
    message: str
    log_type: str
    user_id: str
    system_name: str
    session_timestamp: str


@dataclass
class Issue:
    """Represents an identified issue"""
    issue_id: str
    category: str
    severity: str
    description: str
    pattern: str
    affected_users: List[str] = field(default_factory=list)
    affected_systems: List[str] = field(default_factory=list)
    occurrences: int = 0
    log_entries: List[LogEntry] = field(default_factory=list)
    root_cause: str = ""
    solution: str = ""
    
    @property
    def user_count(self) -> int:
        """Get unique user count"""
        return len(set(self.affected_users))


@dataclass
class AnalysisReport:
    """Complete analysis report"""
    generated_at: datetime
    total_users_analyzed: int
    total_systems_analyzed: int
    total_logs_processed: int
    issues: List[Issue] = field(default_factory=list)
    
    def get_sorted_issues(self) -> List[Issue]:
        """Sort issues by user count (descending) and severity"""
        severity_order = {"Critical": 0, "Error": 1, "Warning": 2, "Information": 3}
        return sorted(
            self.issues,
            key=lambda x: (-x.user_count, severity_order.get(x.severity, 4), -x.occurrences)
        )
