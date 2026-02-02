import React, { useState, useEffect } from 'react';
import './Admin.css';

export default function Admin({ config, onConfigUpdate, isAnalyzing, onAnalysisAction }) {
  const [llmModel, setLlmModel] = useState('');
  const [llmProvider, setLlmProvider] = useState('');
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [llmTemperature, setLlmTemperature] = useState(0.7);
  const [availableModels, setAvailableModels] = useState([]);
  const [analyzerStatus, setAnalyzerStatus] = useState('idle');
  const [lastConfigUpdate, setLastConfigUpdate] = useState(null);
  const [autoAnalysisEnabled, setAutoAnalysisEnabled] = useState(false);
  const [analysisInterval, setAnalysisInterval] = useState(3600); // seconds
  const [logRetentionDays, setLogRetentionDays] = useState(30);
  const [maxThreads, setMaxThreads] = useState(4);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize from config
  useEffect(() => {
    if (config) {
      setLlmModel(config.llm_model || 'llama3.2:3b');
      setLlmProvider(config.llm_provider || 'ollama');
      setLlmEnabled(config.llm_enabled !== false);
      setLlmTemperature(config.llm_temperature || 0.7);
      setAutoAnalysisEnabled(config.auto_analysis_enabled !== false);
      setAnalysisInterval(config.analysis_interval || 3600);
      setLogRetentionDays(config.log_retention_days || 30);
      setMaxThreads(config.max_threads || 4);
    }
  }, [config]);

  // Fetch available models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/models/available');
        if (response.ok) {
          const data = await response.json();
          setAvailableModels(data.models || []);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };
    fetchModels();
  }, []);

  // Fetch analyzer status (initial + refresh)
  const fetchAnalyzerStatus = async () => {
    try {
      const response = await fetch('/api/analyzer/status');
      if (response.ok) {
        const data = await response.json();
        const status = data.status || (data.is_running ? 'running' : 'stopped');
        setAnalyzerStatus(status);
        if (data.last_error) {
          setErrorMessage(`❌ Last analyzer error: ${data.last_error}`);
        } else {
          setErrorMessage('');
        }
      } else {
        setAnalyzerStatus('error');
        setErrorMessage('❌ Failed to fetch analyzer status');
      }
    } catch (error) {
      setAnalyzerStatus('error');
      setErrorMessage(`❌ Error: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchAnalyzerStatus();
  }, []);

  const handleSaveConfiguration = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llm_model: llmModel,
          llm_provider: llmProvider,
          llm_enabled: llmEnabled,
          llm_temperature: parseFloat(llmTemperature),
          auto_analysis_enabled: autoAnalysisEnabled,
          analysis_interval: parseInt(analysisInterval),
          log_retention_days: parseInt(logRetentionDays),
          max_threads: parseInt(maxThreads),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage('✅ Configuration saved successfully!');
        setLastConfigUpdate(new Date().toLocaleString());
        setTimeout(() => setSuccessMessage(''), 3000);
        if (onConfigUpdate) onConfigUpdate(data);
      } else {
        setErrorMessage('❌ Failed to save configuration');
      }
    } catch (error) {
      setErrorMessage(`❌ Error: ${error.message}`);
    }
  };

  const handleAnalyzerAction = async (action) => {
    setErrorMessage('');
    setSuccessMessage('');
    setAnalyzerStatus('processing');

    try {
      const response = await fetch(`/api/analyzer/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const status = data.status || (action === 'start' ? 'running' : action === 'stop' ? 'stopped' : 'restarting');
        const message = data.message || `Analyzer ${action}ed successfully!`;
        setAnalyzerStatus(status);
        setSuccessMessage(`✅ ${message}`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else if (response.status === 409) {
        const detail = data.error || 'Analyzer is already in the requested state';
        const fallbackStatus = action === 'start' ? 'running' : 'stopped';
        setAnalyzerStatus(fallbackStatus);
        setSuccessMessage(`ℹ️ ${detail}`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const detail = data.error || `Failed to ${action} analyzer`;
        setAnalyzerStatus('error');
        setErrorMessage(`❌ ${detail}`);
      }

      fetchAnalyzerStatus();
    } catch (error) {
      setAnalyzerStatus('error');
      setErrorMessage(`❌ Error: ${error.message}`);
    }
  };

  const handleTestLLM = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const response = await fetch('/api/test-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: llmModel,
          provider: llmProvider,
        }),
      });

      if (response.ok) {
        setSuccessMessage('✅ LLM connection test successful!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('❌ LLM connection test failed');
      }
    } catch (error) {
      setErrorMessage(`❌ Error: ${error.message}`);
    }
  };

  const analyzerStatusColor = {
    idle: '#94a3b8',
    running: '#10b981',
    stopped: '#ea580c',
    error: '#dc2626',
    processing: '#f59e0b',
    restarting: '#3b82f6',
  };

  return (
    <div className="admin">
      <div className="admin-header">
        <div>
          <h2>System Administration</h2>
          <p>Configure LLM settings, analyzer controls, and system parameters</p>
        </div>
        <div className="admin-status">
          <div className="status-badge" style={{ background: analyzerStatusColor[analyzerStatus] }}>
            {analyzerStatus.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {errorMessage && <div className="alert alert-error">{errorMessage}</div>}

      <div className="admin-grid">
        {/* LLM Configuration */}
        <div className="admin-card">
          <div className="card-header">
            <h3>🤖 LLM Model Configuration</h3>
            <span className="card-badge">AI Analysis</span>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label>Enable LLM Analysis</label>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={llmEnabled}
                  onChange={(e) => setLlmEnabled(e.target.checked)}
                  id="llm-toggle"
                />
                <label htmlFor="llm-toggle" className="toggle-label">
                  {llmEnabled ? 'Enabled' : 'Disabled'}
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>LLM Provider</label>
              <select
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value)}
                className="form-input"
              >
                <option value="ollama">Ollama</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>

            <div className="form-group">
              <label>Model</label>
              <select
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                className="form-input"
              >
                <option value="">Select a model...</option>
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
                <option value="llama3.2:3b">llama3.2:3b (default)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Temperature (Creativity)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={llmTemperature}
                  onChange={(e) => setLlmTemperature(parseFloat(e.target.value))}
                  className="slider"
                />
                <span className="slider-value">{llmTemperature.toFixed(1)}</span>
              </div>
              <small>Lower = more focused, Higher = more creative</small>
            </div>

            <button className="btn btn-secondary" onClick={handleTestLLM}>
              Test LLM Connection
            </button>
          </div>
        </div>

        {/* Analyzer Controls */}
        <div className="admin-card">
          <div className="card-header">
            <h3>📊 Log Analyzer Controls</h3>
            <span className="card-badge">Operations</span>
          </div>
          <div className="card-content">
            <div className="control-buttons">
              <button
                className="btn btn-success"
                onClick={() => handleAnalyzerAction('start')}
                disabled={analyzerStatus === 'running'}
              >
                ▶️ Start Analyzer
              </button>
              <button
                className="btn btn-warning"
                onClick={() => handleAnalyzerAction('stop')}
                disabled={analyzerStatus === 'stopped'}
              >
                ⏹️ Stop Analyzer
              </button>
              <button
                className="btn btn-info"
                onClick={() => handleAnalyzerAction('restart')}
              >
                🔄 Restart Analyzer
              </button>
            </div>

            <div className="form-group">
              <label>Current Status</label>
              <div className="status-display" style={{ background: analyzerStatusColor[analyzerStatus] }}>
                {analyzerStatus.toUpperCase()}
              </div>
            </div>

            <div className="form-group">
              <label>Enable Auto-Analysis</label>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={autoAnalysisEnabled}
                  onChange={(e) => setAutoAnalysisEnabled(e.target.checked)}
                  id="auto-analysis-toggle"
                />
                <label htmlFor="auto-analysis-toggle" className="toggle-label">
                  {autoAnalysisEnabled ? 'Enabled' : 'Disabled'}
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Analysis Interval (seconds)</label>
              <input
                type="number"
                min="60"
                max="86400"
                step="60"
                value={analysisInterval}
                onChange={(e) => setAnalysisInterval(parseInt(e.target.value))}
                className="form-input"
              />
              <small>{(analysisInterval / 60).toFixed(1)} minutes</small>
            </div>
          </div>
        </div>

        {/* System Configuration */}
        <div className="admin-card">
          <div className="card-header">
            <h3>⚙️ System Configuration</h3>
            <span className="card-badge">Settings</span>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label>Log Retention (days)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={logRetentionDays}
                onChange={(e) => setLogRetentionDays(parseInt(e.target.value))}
                className="form-input"
              />
              <small>Older logs will be automatically deleted</small>
            </div>

            <div className="form-group">
              <label>Max Threads</label>
              <input
                type="number"
                min="1"
                max="16"
                value={maxThreads}
                onChange={(e) => setMaxThreads(parseInt(e.target.value))}
                className="form-input"
              />
              <small>Number of parallel processing threads</small>
            </div>

            <div className="info-box">
              <strong>System Info</strong>
              <div className="info-item">
                <span>Last Config Update:</span>
                <span>{lastConfigUpdate || 'Never'}</span>
              </div>
              <div className="info-item">
                <span>Analysis Status:</span>
                <span style={{ color: analyzerStatusColor[analyzerStatus], fontWeight: 'bold' }}>
                  {analyzerStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="admin-card">
          <div className="card-header">
            <h3>📖 Quick Reference</h3>
            <span className="card-badge">Help</span>
          </div>
          <div className="card-content">
            <div className="reference-item">
              <strong>Temperature Guide:</strong>
              <ul>
                <li>0.0 - 0.5: Deterministic, focused responses</li>
                <li>0.5 - 1.0: Balanced responses</li>
                <li>1.0+: Creative, diverse responses</li>
              </ul>
            </div>

            <div className="reference-item">
              <strong>Auto-Analysis:</strong>
              <p>Automatically runs log analysis at specified intervals when enabled.</p>
            </div>

            <div className="reference-item">
              <strong>Log Retention:</strong>
              <p>Set how long to keep historical logs before automatic cleanup.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Configuration Button */}
      <div className="admin-footer">
        <button className="btn btn-primary btn-large" onClick={handleSaveConfiguration}>
          💾 Save Configuration
        </button>
      </div>
    </div>
  );
}
