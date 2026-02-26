"""
LLM-powered Log Analysis Module
Integrates with local LLMs (Ollama, LM Studio) or cloud providers
"""
import json
import time
import requests
import logging
from typing import List, Dict, Optional
from models import LogEntry, Issue
import hashlib
from config import LLM_REQUEST_TIMEOUT_SECONDS, LLM_MAX_RETRIES

logger = logging.getLogger('log_analyzer.llm')


class LLMAnalyzer:
    """Analyzes logs using Large Language Models"""
    
    def __init__(self, model_name: str = "llama3.2:3b", provider: str = "ollama"):
        """
        Initialize LLM Analyzer
        
        Args:
            model_name: Name of the model to use
            provider: "ollama", "lmstudio", "openai", "azure"
        """
        self.model_name = model_name
        self.provider = provider
        self.base_url = self._get_base_url()
        logger.info(f'LLMAnalyzer initialized: provider={provider}, model={model_name}')
    
    def _get_base_url(self) -> str:
        """Get base URL for the LLM provider"""
        urls = {
            "ollama": "http://localhost:11434",
            "lmstudio": "http://localhost:1234",
            "openai": "https://api.openai.com/v1",
            "azure": "https://your-resource.openai.azure.com"
        }
        url = urls.get(self.provider, urls["ollama"])
        logger.info(f'Base URL for {self.provider}: {url}')
        return url
    
    def get_available_models(self) -> List[Dict]:
        """Get list of available models from the provider"""
        logger.info(f'Fetching available models from {self.provider}')
        try:
            # Disable proxies for localhost connections
            proxies = {
                'http': None,
                'https': None
            }
            
            if self.provider == "ollama":
                url = f"{self.base_url}/api/tags"
                logger.info(f'Querying Ollama endpoint: {url}')
                response = requests.get(
                    url, 
                    timeout=5,
                    proxies=proxies
                )
                logger.info(f'Ollama response status: {response.status_code}')
                if response.status_code == 200:
                    data = response.json()
                    models = [{"name": model["name"], "size": model.get("size", 0)} 
                             for model in data.get("models", [])]
                    logger.info(f'Found {len(models)} models in Ollama')
                    if models:
                        return models
                elif response.status_code == 403:
                    # Proxy interference - return default models
                    logger.warning('Got 403 from Ollama, returning default models')
                    return self._get_default_ollama_models()
            elif self.provider == "lmstudio":
                url = f"{self.base_url}/v1/models"
                logger.info(f'Querying LM Studio endpoint: {url}')
                response = requests.get(
                    url, 
                    timeout=5,
                    proxies=proxies
                )
                logger.info(f'LM Studio response status: {response.status_code}')
                if response.status_code == 200:
                    data = response.json()
                    models = [{"name": model["id"], "size": 0} 
                           for model in data.get("data", [])]
                    logger.info(f'Found {len(models)} models in LM Studio')
                    return models
        except requests.exceptions.Timeout:
            logger.warning(f'Timeout connecting to {self.provider} at {self.base_url}')
        except requests.exceptions.ConnectionError:
            logger.warning(f'Connection error to {self.provider} at {self.base_url}')
        except Exception as e:
            logger.error(f'Error fetching models from {self.provider}: {str(e)}', exc_info=True)
            if self.provider == "ollama":
                return self._get_default_ollama_models()
        
        logger.warning(f'Could not fetch models, returning empty list')
        return []
    
    def _get_default_ollama_models(self) -> List[Dict]:
        """Return list of commonly available Ollama models"""
        # These are the default models often available in Ollama installations
        return [
            {"name": "llama3.2:3b", "size": 2000000000},
            {"name": "llama3.2:1b", "size": 1300000000},
            {"name": "phi3:mini", "size": 2200000000},
            {"name": "mistral", "size": 4000000000},
        ]
    
    def analyze_log_entry_with_llm(self, log_entry: LogEntry) -> Dict:
        """
        Analyze a single log entry using LLM
        
        Returns: Dict with category, severity, root_cause, solution, confidence
        """
        prompt = f"""Analyze this Windows Event Log entry and provide structured analysis:

Log Type: {log_entry.log_type}
Level: {log_entry.level}
Source: {log_entry.source}
Event ID: {log_entry.event_id}
Message: {log_entry.message[:500]}

Provide analysis in JSON format:
{{
    "category": "specific category (e.g., Network, Driver, Security)",
    "severity": "Critical|Error|Warning|Information",
    "root_cause": "brief explanation of why this occurred",
    "solution": "recommended action to resolve",
    "confidence": 0.0-1.0,
    "is_issue": true|false
}}

Only respond with valid JSON, no other text."""

        try:
            analysis = self._call_llm(prompt)
            
            # Parse JSON response
            if isinstance(analysis, str):
                # Try to extract JSON from response
                start = analysis.find('{')
                end = analysis.rfind('}') + 1
                if start != -1 and end > start:
                    json_str = analysis[start:end]
                    result = json.loads(json_str)
                else:
                    result = json.loads(analysis)
            else:
                result = analysis
            
            # Validate required fields
            required = ["category", "severity", "root_cause", "solution"]
            if all(key in result for key in required):
                return result
            else:
                return self._get_fallback_analysis(log_entry)
                
        except Exception as e:
            print(f"Error in LLM analysis: {e}")
            return self._get_fallback_analysis(log_entry)
    
    def analyze_issue_group_with_llm(self, entries: List[LogEntry]) -> Dict:
        """
        Analyze a group of similar log entries to provide comprehensive insights
        """
        # Take sample entries (max 3)
        sample_entries = entries[:3]
        
        # Build prompt with multiple entries
        entries_text = "\n\n".join([
            f"Entry {i+1}:\n"
            f"Time: {entry.timestamp}\n"
            f"Level: {entry.level}\n"
            f"Source: {entry.source}\n"
            f"Event ID: {entry.event_id}\n"
            f"User: {entry.user_id}, System: {entry.system_name}\n"
            f"Message: {entry.message[:300]}"
            for i, entry in enumerate(sample_entries)
        ])
        
        prompt = f"""Analyze these {len(entries)} similar log entries from multiple users/systems:

{entries_text}

Total occurrences: {len(entries)}
Affected users: {len(set(e.user_id for e in entries))}
Affected systems: {len(set(e.system_name for e in entries))}

Provide comprehensive analysis in JSON format:
{{
    "issue_title": "brief descriptive title",
    "category": "specific category",
    "severity": "Critical|Error|Warning|Information",
    "root_cause": "detailed explanation of root cause",
    "solution": "step-by-step solution",
    "impact": "description of impact on users/systems",
    "priority": "High|Medium|Low",
    "confidence": 0.0-1.0
}}

Only respond with valid JSON, no other text."""

        try:
            analysis = self._call_llm(prompt)
            
            # Parse JSON
            if isinstance(analysis, str):
                start = analysis.find('{')
                end = analysis.rfind('}') + 1
                if start != -1 and end > start:
                    json_str = analysis[start:end]
                    result = json.loads(json_str)
                else:
                    result = json.loads(analysis)
            else:
                result = analysis
            
            return result
            
        except Exception as e:
            logger.warning(f"LLM group analysis failed: {e}")
            return {
                "issue_title": "Automatic Analysis Failed",
                "category": "Unknown",
                "severity": entries[0].level,
                "root_cause": "Unable to analyze with LLM",
                "solution": "Review manually",
                "impact": "Unknown impact",
                "priority": "Medium",
                "confidence": 0.0
            }
    
    def _call_llm(self, prompt: str, max_retries: Optional[int] = None) -> str:
        """Call the LLM API with retries and longer timeout for slow local models."""
        retries = max_retries if max_retries is not None else LLM_MAX_RETRIES

        # Disable proxies for localhost connections
        proxies = {
            'http': None,
            'https': None
        }
        
        last_error = None
        
        for attempt in range(retries):
            try:
                if self.provider == "ollama":
                    response = requests.post(
                        f"{self.base_url}/api/generate",
                        json={
                            "model": self.model_name,
                            "prompt": prompt,
                            "stream": False,
                            "options": {
                                "temperature": 0.3,
                                "top_p": 0.9
                            }
                        },
                        timeout=LLM_REQUEST_TIMEOUT_SECONDS,
                        proxies=proxies
                    )
                    
                    if response.status_code == 200:
                        return response.json()["response"]
                    else:
                        last_error = f"Ollama returned status {response.status_code}"
                
                elif self.provider == "lmstudio":
                    response = requests.post(
                        f"{self.base_url}/v1/chat/completions",
                        json={
                            "model": self.model_name,
                            "messages": [{"role": "user", "content": prompt}],
                            "temperature": 0.3
                        },
                        timeout=LLM_REQUEST_TIMEOUT_SECONDS,
                        proxies=proxies
                    )
                    
                    if response.status_code == 200:
                        return response.json()["choices"][0]["message"]["content"]
                    else:
                        last_error = f"LMStudio returned status {response.status_code}"
                
            except requests.exceptions.Timeout:
                last_error = f"Timeout on attempt {attempt + 1}"
                logger.warning(f"[LLM] {last_error} (provider={self.provider}, model={self.model_name})")
                # brief backoff before retrying
                time.sleep(1 + attempt)
                continue
            except Exception as e:
                last_error = str(e)
                logger.warning(f"[LLM] Error calling LLM (provider={self.provider}, model={self.model_name}): {e}")
                break
        
        raise Exception(f"Failed to get response from LLM after {retries} attempt(s): {last_error}")
    
    def _get_fallback_analysis(self, log_entry: LogEntry) -> Dict:
        """Provide fallback analysis when LLM fails"""
        return {
            "category": "System",
            "severity": log_entry.level,
            "root_cause": "Requires manual investigation",
            "solution": "Review event details and system logs",
            "confidence": 0.1,
            "is_issue": log_entry.level in ["Error", "Critical", "Warning"]
        }
    
    def check_provider_availability(self) -> bool:
        """Check if the LLM provider is available"""
        try:
            # Disable proxies for localhost connections
            proxies = {
                'http': None,
                'https': None
            }
            
            if self.provider == "ollama":
                # Try to get models from Ollama
                response = requests.get(
                    f"{self.base_url}/api/tags", 
                    timeout=3,
                    proxies=proxies
                )
                # Accept 200 OK or 403 Forbidden (means Ollama is running but may have access restrictions)
                if response.status_code == 200:
                    return True
                elif response.status_code == 403:
                    # Ollama is running but returning 403 due to proxy - it's still functional
                    return True
                return False
            elif self.provider == "lmstudio":
                response = requests.get(
                    f"{self.base_url}/v1/models", 
                    timeout=3,
                    proxies=proxies
                )
                return response.status_code == 200
            return False
        except Exception as e:
            print(f"Provider availability check failed: {e}")
            return False
