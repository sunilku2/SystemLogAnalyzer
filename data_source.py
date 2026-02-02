"""
Data Source Abstraction Layer
Provides interface for reading logs from filesystem or database
"""
from abc import ABC, abstractmethod
import logging
from typing import List
from models import LogEntry

logger = logging.getLogger('log_analyzer.data_source')


class DataSource(ABC):
    """Abstract base class for data sources"""
    
    @abstractmethod
    def get_log_entries(self, **kwargs) -> List[LogEntry]:
        """Retrieve log entries from the data source"""
        pass
    
    @abstractmethod
    def get_statistics(self) -> dict:
        """Get statistics about the data source"""
        pass


class FileSystemDataSource(DataSource):
    """Data source implementation for reading logs from filesystem"""
    
    def __init__(self, log_parser, base_logs_dir: str, log_types: List[str]):
        self.log_parser = log_parser
        self.base_logs_dir = base_logs_dir
        self.log_types = log_types
    
    def get_log_entries(self, **kwargs) -> List[LogEntry]:
        """Read log entries from filesystem"""
        logger.info(f'Retrieving log entries from {self.base_logs_dir}')
        logger.info(f'Log types to retrieve: {self.log_types}')
        entries = self.log_parser.parse_all_logs(self.base_logs_dir, self.log_types)
        logger.info(f'Retrieved {len(entries)} log entries')
        return entries
    
    def get_statistics(self) -> dict:
        """Get statistics about filesystem logs"""
        logger.info('Gathering filesystem statistics')
        discovered = self.log_parser.discover_logs(self.base_logs_dir)
        unique_users = set(user_id for user_id, _, _, _ in discovered)
        unique_systems = set(system_name for _, system_name, _, _ in discovered)
        
        stats = {
            "total_sessions": len(discovered),
            "unique_users": len(unique_users),
            "unique_systems": len(unique_systems),
            "source_type": "filesystem",
            "base_directory": self.base_logs_dir
        }
        logger.info(f'Filesystem stats: {len(discovered)} sessions, {len(unique_users)} users, {len(unique_systems)} systems')
        return stats


class DatabaseDataSource(DataSource):
    """
    Data source implementation for reading logs from database
    This is a placeholder for future database integration
    """
    
    def __init__(self, db_config: dict):
        self.db_config = db_config
        self.connection = None
        # TODO: Initialize database connection
    
    def get_log_entries(self, **kwargs) -> List[LogEntry]:
        """
        Read log entries from database
        
        Future implementation will:
        1. Connect to database
        2. Execute query to fetch log entries
        3. Convert database rows to LogEntry objects
        4. Return list of LogEntry objects
        """
        raise NotImplementedError(
            "Database data source not yet implemented. "
            "This will be available in a future version."
        )
    
    def get_statistics(self) -> dict:
        """Get statistics about database logs"""
        # TODO: Implement database statistics
        return {
            "source_type": "database",
            "status": "not_implemented"
        }
    
    def _connect(self):
        """Establish database connection"""
        # TODO: Implement database connection
        # Example for PostgreSQL:
        # import psycopg2
        # self.connection = psycopg2.connect(
        #     host=self.db_config['host'],
        #     port=self.db_config['port'],
        #     database=self.db_config['database'],
        #     user=self.db_config['user'],
        #     password=self.db_config['password']
        # )
        pass
    
    def _execute_query(self, query: str, params: tuple = None):
        """Execute database query"""
        # TODO: Implement query execution
        pass


class DataSourceFactory:
    """Factory for creating appropriate data source"""
    
    @staticmethod
    def create_data_source(source_type: str, **kwargs) -> DataSource:
        """
        Create and return appropriate data source
        
        Args:
            source_type: "filesystem" or "database"
            **kwargs: Configuration parameters for the data source
        
        Returns:
            DataSource instance
        """
        if source_type == "filesystem":
            log_parser = kwargs.get('log_parser')
            base_logs_dir = kwargs.get('base_logs_dir')
            log_types = kwargs.get('log_types')
            
            if not all([log_parser, base_logs_dir, log_types]):
                raise ValueError("FileSystemDataSource requires: log_parser, base_logs_dir, log_types")
            
            return FileSystemDataSource(log_parser, base_logs_dir, log_types)
        
        elif source_type == "database":
            db_config = kwargs.get('db_config')
            
            if not db_config:
                raise ValueError("DatabaseDataSource requires: db_config")
            
            return DatabaseDataSource(db_config)
        
        else:
            raise ValueError(f"Unknown data source type: {source_type}")
