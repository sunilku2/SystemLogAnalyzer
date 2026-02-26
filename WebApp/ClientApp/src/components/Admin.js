import React, { useState, useEffect, useCallback } from 'react';
import './Admin.css';
import { API_BASE_URL } from '../services/api';

// Helper function to construct full API URLs
const getApiUrl = (endpoint) => {
  const baseUrl = API_BASE_URL.replace(/\/api$/, ''); // Remove /api suffix if present
  return `${baseUrl}/api${endpoint}`;
};

export default function Admin({ config, onConfigUpdate, isAnalyzing, onAnalysisAction, onInMemoryDataCleared }) {
  const [llmModel, setLlmModel] = useState('');
  const [llmProvider, setLlmProvider] = useState('');
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [llmTemperature, setLlmTemperature] = useState(0.7);
  const [availableModels, setAvailableModels] = useState([]);
  const [installedModels, setInstalledModels] = useState([]);
  const [analyzerStatus, setAnalyzerStatus] = useState('idle');
  const [lastConfigUpdate, setLastConfigUpdate] = useState(null);
  const [autoAnalysisEnabled, setAutoAnalysisEnabled] = useState(false);
  const [analysisInterval, setAnalysisInterval] = useState(3600); // seconds
  const [logRetentionDays, setLogRetentionDays] = useState(30);
  const [maxThreads, setMaxThreads] = useState(4);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloading70b, setIsDownloading70b] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState({ is_running: false });
  const [modelToDownload, setModelToDownload] = useState('');
  const [ollamaInstalled, setOllamaInstalled] = useState({ is_installed: false });
  const [isStartingOllama, setIsStartingOllama] = useState(false);
  const [isInstallingOllama, setIsInstallingOllama] = useState(false);
  const [isClearingMemory, setIsClearingMemory] = useState(false);

  // Initialize from config
  useEffect(() => {
    if (config) {
      setLlmModel(config.llm_model || 'llama3.1:70b');
      setLlmProvider(config.llm_provider || 'ollama');
      setLlmEnabled(config.llm_enabled !== false);
      setLlmTemperature(config.llm_temperature || 0.7);
      setAutoAnalysisEnabled(config.auto_analysis_enabled !== false);
      setAnalysisInterval(config.analysis_interval || 3600);
      setLogRetentionDays(config.log_retention_days || 30);
      setMaxThreads(config.max_threads || 4);
    }
  }, [config]);

  const loadModels = useCallback(async (provider) => {
    try {
      const response = await fetch(getApiUrl(`/models/available?provider=${encodeURIComponent(provider)}`));
      if (response.ok) {
        const data = await response.json();
        setAvailableModels(data.models || []);
        setInstalledModels(data.installed_models || data.models || []);
      } else {
        setAvailableModels([]);
        setInstalledModels([]);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      setAvailableModels([]);
      setInstalledModels([]);
    }
  }, []);

  // Fetch available models when provider changes
  useEffect(() => {
    if (llmProvider) {
      loadModels(llmProvider);
    }
  }, [llmProvider, loadModels]);

  // Fetch analyzer status (initial + refresh)
  const fetchAnalyzerStatus = async () => {
    try {
      const response = await fetch(getApiUrl('/analyzer/status'));
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

  const fetchOllamaStatus = async () => {
    try {
      const response = await fetch(getApiUrl('/ollama/status'));
      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response from /api/ollama/status');
        setOllamaStatus({ is_running: false, error: 'Server returned invalid response' });
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setOllamaStatus(data);
      } else {
        setOllamaStatus({ is_running: false, error: 'Failed to fetch status' });
      }
    } catch (error) {
      console.error('Failed to fetch Ollama status:', error);
      setOllamaStatus({ is_running: false, error: error.message });
    }
  };

  const checkOllamaInstalled = async () => {
    try {
      const response = await fetch(getApiUrl('/ollama/check-installed'));
      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response from /api/ollama/check-installed');
        setOllamaInstalled({ is_installed: false, error: 'Server returned invalid response' });
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setOllamaInstalled(data);
      }
    } catch (error) {
      console.error('Failed to check Ollama installation:', error);
      setOllamaInstalled({ is_installed: false, error: error.message });
    }
  };

  useEffect(() => {
    fetchAnalyzerStatus();
    fetchOllamaStatus();
    checkOllamaInstalled();
  }, []);

  const handleSaveConfiguration = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const response = await fetch(getApiUrl('/config'), {
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
      const response = await fetch(getApiUrl(`/analyzer/${action}`), {
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

  const handleClearInMemoryData = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsClearingMemory(true);

    try {
      const response = await fetch(getApiUrl('/analyzer/clear-memory'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        setSuccessMessage('✅ In-memory analysis data cleared. Dashboard will refresh with current backend state.');
        if (onInMemoryDataCleared) {
          await onInMemoryDataCleared();
        }
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setErrorMessage(`❌ ${data.error || 'Failed to clear in-memory data'}`);
      }

      fetchAnalyzerStatus();
    } catch (error) {
      setErrorMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsClearingMemory(false);
    }
  };

  const handleTestLLM = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const response = await fetch(getApiUrl('/test-llm'), {
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

  const handleDownloadAndAnalyze = async () => {
    if (!onAnalysisAction) return;
    if (!llmModel) {
      setErrorMessage('❌ Please select a model to download.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsDownloading(true);

    try {
      await onAnalysisAction({
        useLlm: true,
        model: llmModel,
        provider: llmProvider,
        autoDownload: true
      });

      setSuccessMessage('✅ Model download initiated (if needed) and analysis started.');
      setTimeout(() => setSuccessMessage(''), 4000);
      loadModels(llmProvider);
    } catch (error) {
      setErrorMessage(`❌ ${error.message || 'Failed to download model and analyze.'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadModel = async () => {
    if (!modelToDownload) {
      setErrorMessage('❌ Please select a model to download.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsDownloading(true);

    try {
      const response = await fetch(getApiUrl('/ollama/pull'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelToDownload }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(`✅ Model '${modelToDownload}' downloaded successfully!`);
        setTimeout(() => setSuccessMessage(''), 4000);
        setModelToDownload('');
        fetchOllamaStatus();
        loadModels(llmProvider);
      } else {
        setErrorMessage(`❌ ${data.error || 'Failed to download model'}`);
      }
    } catch (error) {
      setErrorMessage(`❌ ${error.message || 'Failed to download model.'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownload70bModel = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsDownloading70b(true);

    try {
      const response = await fetch(getApiUrl('/ollama/pull'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3.1:70b' }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('✅ llama3.1:70b downloaded successfully! Best model for Windows log analysis. Now set it as your default model above.');
        setTimeout(() => setSuccessMessage(''), 5000);
        setLlmModel('llama3.1:70b'); // Auto-select after download
        fetchOllamaStatus();
        loadModels(llmProvider);
      } else {
        setErrorMessage(`❌ ${data.error || 'Failed to download llama3.1:70b'}`);
      }
    } catch (error) {
      setErrorMessage(`❌ ${error.message || 'Failed to download model.'}`);
    } finally {
      setIsDownloading70b(false);
    }
  };

  const handleStartOllama = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsStartingOllama(true);

    try {
      const response = await fetch(getApiUrl('/ollama/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.is_running) {
        setSuccessMessage('✅ Ollama started successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchOllamaStatus();
      } else if (data.started) {
        setSuccessMessage('⏳ Ollama is starting... Please wait a moment and refresh status.');
        setTimeout(() => {
          fetchOllamaStatus();
          setSuccessMessage('');
        }, 3000);
      } else if (data.is_installed === false) {
        setErrorMessage(`❌ Ollama is not installed. Click the download button below to get it.`);
      } else {
        setErrorMessage(`❌ ${data.error || 'Failed to start Ollama'}`);
      }
    } catch (error) {
      setErrorMessage(`❌ ${error.message || 'Failed to start Ollama.'}`);
    } finally {
      setIsStartingOllama(false);
    }
  };

  const handleInstallOllama = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsInstallingOllama(true);

    try {
      const response = await fetch(getApiUrl('/ollama/install'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        setErrorMessage(`❌ Server error: ${text.substring(0, 100)}`);
        setIsInstallingOllama(false);
        return;
      }

      const data = await response.json();

      if (data.is_installed) {
        setSuccessMessage('✅ Ollama installed successfully! Now click "Start Ollama" to run it.');
        setTimeout(() => setSuccessMessage(''), 5000);
        // Refresh installation status
        setTimeout(() => {
          checkOllamaInstalled();
        }, 2000);
      } else if (data.installing) {
        setSuccessMessage('⏳ Ollama installation started. A window will open to complete setup. Please close it when done and click "Refresh Status".');
      } else {
        setErrorMessage(`❌ ${data.error || 'Failed to install Ollama'}`);
      }
    } catch (error) {
      console.error('Installation error:', error);
      setErrorMessage(`❌ ${error.message || 'Failed to install Ollama.'}`);
    } finally {
      setIsInstallingOllama(false);
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

  const supportsDownload = llmProvider === 'ollama';
  const isModelSelected = Boolean(llmModel);
  const isModelAvailable = !supportsDownload || !isModelSelected || installedModels.includes(llmModel);

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
                <option value="llama3.1:70b">⭐ llama3.1:70b (Recommended - Best Accuracy)</option>
                <option value="llama3.2:3b">llama3.2:3b (default)</option>
                <option value="mistral">mistral</option>
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            {llmEnabled && supportsDownload && isModelSelected && !isModelAvailable && (
              <div className="alert alert-warning">
                <span>⚠️ Selected model is not installed locally.</span>
                <button
                  className="btn btn-primary"
                  onClick={handleDownloadAndAnalyze}
                  disabled={isDownloading || isAnalyzing}
                >
                  {isDownloading ? '⬇️ Downloading...' : '⬇️ Download & Analyze Now'}
                </button>
              </div>
            )}

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

        {/* Ollama Status */}
        {supportsDownload && ollamaStatus && (
          <div className="admin-card">
            <div className="card-header">
              <h3>🦙 Ollama Status</h3>
              <span className="card-badge">Service</span>
            </div>
            <div className="card-content">
              <div className="form-group">
                <label>Service Status</label>
                <div className="status-display" style={{
                  background: ollamaStatus.is_running ? '#10b981' : '#ea580c',
                  marginBottom: '16px'
                }}>
                  {ollamaStatus.is_running ? '✅ RUNNING' : '❌ STOPPED'}
                </div>
              </div>

              {!ollamaStatus.is_running && (
                <div className="alert alert-error">
                  <span>⚠️ Ollama service is not running.</span>
                </div>
              )}

              {!ollamaStatus.is_running && ollamaInstalled && ollamaInstalled.is_installed && (
                <button className="btn btn-success w-full" onClick={handleStartOllama} disabled={isStartingOllama}>
                  {isStartingOllama ? '▶️ Starting...' : '▶️ Start Ollama'}
                </button>
              )}

              {!ollamaStatus.is_running && ollamaInstalled && !ollamaInstalled.is_installed && (
                <>
                  <div className="alert alert-error">
                    <span>❌ Ollama is not installed on this system.</span>
                  </div>
                  <button 
                    className="btn btn-primary w-full"
                    onClick={handleInstallOllama}
                    disabled={isInstallingOllama}
                  >
                    {isInstallingOllama ? '⏳ Installing...' : '📥 Download & Install Ollama'}
                  </button>
                  <p className="installation-note">
                    Ollama will be downloaded and installed automatically. The installer window will open when ready.
                  </p>
                </>
              )}

              {ollamaStatus.is_running && (
                <>
                  <div className="form-group">
                    <label>Base URL</label>
                    <div className="url-display">
                      {ollamaStatus.base_url}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Installed Models ({ollamaStatus.model_count})</label>
                    {ollamaStatus.installed_models && ollamaStatus.installed_models.length > 0 ? (
                      <div className="models-list">
                        <div className="model-summary">
                          📦 {ollamaStatus.model_count} model(s) • {ollamaStatus.total_size_gb} GB total
                        </div>
                        {ollamaStatus.installed_models.map((model, idx) => (
                          <div key={idx} className="model-item">
                            <div className="model-name">📄 {model.name}</div>
                            <div className="model-size">{model.size_gb} GB</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="alert alert-info">
                        <span>ℹ️ No models installed. Use download section below.</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Download Model</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginBottom: '16px' }}>
                      <button
                        className="btn btn-success"
                        onClick={handleDownload70bModel}
                        disabled={isDownloading70b || !ollamaStatus.is_running}
                        style={{ gridColumn: '1 / -1' }}
                      >
                        {isDownloading70b ? '⬇️ Downloading llama3.1:70b...' : '⚡ Download llama3.1:70b (Recommended)'}
                      </button>
                    </div>
                    <small style={{ display: 'block', marginBottom: '12px', color: '#10b981' }}>
                      ✅ Best accuracy for Windows log analysis (requires ~45GB disk space)
                    </small>
                    
                    <label style={{ marginTop: '12px' }}>Or Download Other Model</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="e.g., llama3.2:3b, mistral, phi3:mini"
                        value={modelToDownload}
                        onChange={(e) => setModelToDownload(e.target.value)}
                        className="form-input"
                      />
                      <button
                        className="btn btn-success"
                        onClick={handleDownloadModel}
                        disabled={isDownloading || !modelToDownload}
                      >
                        {isDownloading ? '⬇️...' : '⬇️ Pull'}
                      </button>
                    </div>
                    <small>Enter model name and click Pull to download</small>
                  </div>
                </>
              )}

              <button className="btn btn-secondary" onClick={fetchOllamaStatus}>
                🔄 Refresh Status
              </button>
            </div>
          </div>
        )}

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

            <button
              className="btn btn-warning w-full"
              onClick={handleClearInMemoryData}
              disabled={isClearingMemory}
              style={{ marginBottom: '16px' }}
            >
              {isClearingMemory ? '🧹 Clearing In-Memory Data...' : '🧹 Clear Stale In-Memory Data'}
            </button>

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
