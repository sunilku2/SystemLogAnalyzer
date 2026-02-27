"""
Configuration settings for Log Analyzer
"""
import os

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGS_DIR = os.path.join(BASE_DIR, "analysis_logs")

# Analysis scope
ANALYSIS_SCOPE = os.environ.get("LOG_ANALYZER_SCOPE", "network").lower()  # Options: "network", "all"
NETWORK_ANALYSIS_ONLY = ANALYSIS_SCOPE == "network"

# Log types to analyze
LOG_TYPES = [
    "Network.log",
    "network_logs.txt",
    "network_dhcp.log",
    "network_dns.log",
    "network_firewall.log",
    "network_ncsi.log",
    "network_networkprofile.log",
    "network_other.log",
    "network_tcpip.log",
    "network_wlan.log"
]

NETWORK_LOG_KEYWORDS = [
    "network",
    "ncsi",
    "wlan",
    "dns",
    "dhcp",
    "tcpip",
    "firewall",
    "nla",
    "connectivity"
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
LLM_MODEL = "llama3.2:3b"  # Default model aligned with requested Ollama 3b model
LLM_ONLY_ANALYSIS = os.environ.get("LOG_ANALYZER_LLM_ONLY", "true").lower() == "true"
LLM_FALLBACK_TO_PATTERNS = False  # Disabled to enforce strict LLM-only analysis
LLM_REQUEST_TIMEOUT_SECONDS = int(os.environ.get("LOG_ANALYZER_LLM_TIMEOUT", "180"))
LLM_MAX_RETRIES = int(os.environ.get("LOG_ANALYZER_LLM_RETRIES", "3"))

# Available LLM Providers
LLM_PROVIDERS = {
    "ollama": {
        "name": "Ollama (Local)",
        "url": "http://localhost:11434",
        "models": ["llama3.1:70b", "llama3.1:8b", "mistral:large", "llama3.2:11b", "neural-chat"]
    },
    "lmstudio": {
        "name": "LM Studio (Local)",
        "url": "http://localhost:1234",
        "models": []  # Auto-detected
    }
}
