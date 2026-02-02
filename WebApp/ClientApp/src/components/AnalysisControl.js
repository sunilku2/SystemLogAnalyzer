import React, { useState, useEffect, useCallback } from 'react';
import { fetchAvailableModels } from '../services/api';
import './AnalysisControl.css';

function AnalysisControl({ config, sessions, onRunAnalysis, isAnalyzing }) {
  const [useLlm, setUseLlm] = useState(config?.llm_enabled || false);
  const [provider, setProvider] = useState(config?.llm_provider || 'ollama');
  const [model, setModel] = useState(config?.llm_model || '');
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Keep local state in sync with config after it loads
  useEffect(() => {
    if (config) {
      setUseLlm(config.llm_enabled || false);
      setProvider(config.llm_provider || 'ollama');
      setModel(config.llm_model || '');
    }
  }, [config]);

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const data = await fetchAvailableModels(provider);
      const models = Array.isArray(data.models) ? data.models : [];
      setAvailableModels(models);
      if (models.length > 0 && !model) {
        setModel(models[0]);
      }
    } catch (err) {
      console.error('Error loading models:', err);
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [provider, model]);

  useEffect(() => {
    if (useLlm && provider) {
      loadModels();
    }
  }, [provider, useLlm, loadModels]);

  const handleRunAnalysis = () => {
    onRunAnalysis({
      useLlm,
      model: useLlm ? model : null,
      provider: useLlm ? provider : null
    });
  };

  return (
    <div className="analysis-control">
      <div className="page-header">
        <h2>🚀 Analyze Fleet Data</h2>
        <p>Configure analysis settings and scan your device fleet logs</p>
      </div>

      <div className="grid grid-cols-2">
        {/* Configuration Panel */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Fleet Analysis Settings</h3>
          </div>
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useLlm}
                onChange={(e) => setUseLlm(e.target.checked)}
                className="checkbox"
              />
              <span className="checkbox-text">
                <strong>Use AI/LLM for Enhanced Analysis</strong>
                <span className="checkbox-desc">Get AI-powered insights and root cause analysis</span>
              </span>
            </label>
          </div>

          {useLlm && (
            <>
              <div className="form-group">
                <label className="form-label">LLM Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="form-select"
                >
                  <option value="ollama">Ollama (Local)</option>
                  <option value="lmstudio">LM Studio (Local)</option>
                </select>
                <span className="form-hint">Select your local LLM provider</span>
              </div>

              <div className="form-group">
                <label className="form-label">Model</label>
                {loadingModels ? (
                  <div className="model-loading">
                    <div className="spinner spinner-sm"></div>
                    <span>Loading models...</span>
                  </div>
                ) : availableModels.length > 0 ? (
                  <>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="form-select"
                    >
                      {availableModels.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <span className="form-hint">{availableModels.length} model(s) available</span>
                  </>
                ) : (
                  <div className="alert alert-warning">
                    <span>⚠️ No models found. Please ensure {provider} is running.</span>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || (useLlm && !model)}
            className="btn btn-primary btn-lg w-full"
          >
            {isAnalyzing ? (
              <>
                <div className="spinner spinner-sm"></div>
                Analyzing...
              </>
            ) : (
              <>
                ▶️ Start Analysis
              </>
            )}
          </button>
        </div>

        {/* Session Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Data Source Information</h3>
          </div>
          
          {sessions ? (
            <>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Total Sessions</div>
                  <div className="info-value">{sessions.statistics.total_sessions}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Unique Users</div>
                  <div className="info-value">{sessions.statistics.unique_users}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Unique Systems</div>
                  <div className="info-value">{sessions.statistics.unique_systems}</div>
                </div>
              </div>

              <div className="sessions-list">
                <h4>Available Sessions</h4>
                {sessions.sessions.slice(0, 5).map((session, i) => (
                  <div key={i} className="session-item">
                    <span className="session-icon">📁</span>
                    <div className="session-info">
                      <div className="session-user">User: {session.userId}</div>
                      <div className="session-details">
                        {session.systemName} • {session.sessionTimestamp}
                      </div>
                    </div>
                  </div>
                ))}
                {sessions.sessions.length > 5 && (
                  <div className="session-more">
                    +{sessions.sessions.length - 5} more sessions
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state-small">
              <p>No session data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Panel */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">ℹ️ Analysis Information</h3>
        </div>
        <div className="info-panel">
          <div className="info-section">
            <h4>What happens during analysis?</h4>
            <ul>
              <li>All log files from discovered sessions are parsed</li>
              <li>Events are categorized by severity (Critical, Error, Warning)</li>
              <li>Similar issues across users are grouped together</li>
              {useLlm && <li>AI analyzes each issue to provide root cause and solutions</li>}
              <li>Comprehensive report with insights is generated</li>
            </ul>
          </div>
          
          {useLlm && (
            <div className="info-section">
              <h4>AI-Enhanced Analysis Benefits:</h4>
              <ul>
                <li>✨ Intelligent root cause identification</li>
                <li>🎯 Context-aware solution recommendations</li>
                <li>📊 Better issue categorization</li>
                <li>💡 Actionable insights from log patterns</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalysisControl;
