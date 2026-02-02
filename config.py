"""
Configuration settings for Log Analyzer
"""
import os

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGS_DIR = os.path.join(BASE_DIR, "analysis_logs")

# Log types to analyze
LOG_TYPES = [
    "System.log",
    "Application.log",
    "Network.log",
    "network_ncsi.log",
    "network_wlan.log",
    "Driver.log"
]

# Data source configuration (for future DB integration)
DATA_SOURCE = "filesystem"  # Options: "filesystem", "database"

# Database configuration (for future use)
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "log_analyzer",
    "user": "admin",
    "password": "password"
}

# Report settings
REPORT_OUTPUT_DIR = os.path.join(BASE_DIR, "reports")
REPORT_FORMAT = "both"  # Options: "console", "html", "json", "both"

# Issue detection thresholds
MIN_SIMILARITY_SCORE = 0.7  # Minimum similarity to group issues together
MIN_USER_THRESHOLD = 1  # Minimum users affected to report an issue

# LLM Configuration
LLM_ENABLED = True  # Enable/disable LLM analysis
LLM_PROVIDER = "ollama"  # Options: "ollama", "lmstudio", "openai", "azure"
LLM_MODEL = "llama3.2:3b"  # Default model (can be changed at runtime)
LLM_FALLBACK_TO_PATTERNS = True  # Use pattern matching if LLM fails

# Available LLM Providers
LLM_PROVIDERS = {
    "ollama": {
        "name": "Ollama (Local)",
        "url": "http://localhost:11434",
        "models": ["llama3.2:3b", "llama3.2:1b", "mistral", "phi3", "gemma2"]
    },
    "lmstudio": {
        "name": "LM Studio (Local)",
        "url": "http://localhost:1234",
        "models": []  # Auto-detected
    }
}
