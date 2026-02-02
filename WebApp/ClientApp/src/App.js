import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import AnalysisControl from './components/AnalysisControl';
import SystemDetails from './components/SystemDetails';
import ApplicationsView from './components/ApplicationsView';
import UsersView from './components/UsersView';
import Alerts from './components/Alerts';
import Trends from './components/Trends';
import LocationsView from './components/LocationsView';
import NetworkExperience from './components/NetworkExperience';
import BootLogonView from './components/BootLogonView';
import AppStabilityView from './components/AppStabilityView';
import ReportsView from './components/ReportsView';
import Admin from './components/Admin';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { fetchConfig, fetchSessions, runAnalysis, fetchLatestReport } from './services/api';

function App() {
  const [config, setConfig] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

    const pollLatestReport = async () => {
      try {
        const latest = await fetchLatestReport();
        if (latest && latest.success) {
          setAnalysisResult(latest);
        }
      } catch (err) {
        // Ignore polling errors to avoid noisy UI; next interval will retry
      }
    };

    const intervalId = setInterval(pollLatestReport, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  const loadInitialData = async () => {
    try {
      const [configData, sessionsData] = await Promise.all([
        fetchConfig(),
        fetchSessions()
      ]);
      
      setConfig(configData);
      setSessions(sessionsData);
      
      // Try to load latest report
      try {
        const latestReport = await fetchLatestReport();
        if (latestReport && latestReport.success) {
          setAnalysisResult(latestReport);
        }
      } catch (err) {
        // No latest report available
      }
    } catch (err) {
      setError('Failed to load initial data: ' + err.message);
    }
  };

  const handleRunAnalysis = async (settings) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await runAnalysis(settings);
      setAnalysisResult(result);
      setActiveView('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app">
      <Header config={config} />
      
      <div className="app-layout">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        
        <main className="main-content">
          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              <span>{error}</span>
              <button onClick={() => setError(null)} className="alert-close">×</button>
            </div>
          )}

          {activeView === 'dashboard' && (
            <div className="fade-in">
              <Dashboard 
                analysisResult={analysisResult} 
                sessions={sessions}
                isAnalyzing={isAnalyzing}
                onNavigate={setActiveView}
              />
            </div>
          )}

          {activeView === 'analyze' && (
            <div className="fade-in">
              <AnalysisControl 
                config={config}
                sessions={sessions}
                onRunAnalysis={handleRunAnalysis}
                isAnalyzing={isAnalyzing}
              />
            </div>
          )}

          {activeView === 'systems' && (
            <div className="fade-in">
              <SystemDetails 
                analysisResult={analysisResult}
                sessions={sessions}
              />
            </div>
          )}

          {activeView === 'applications' && (
            <div className="fade-in">
              <ApplicationsView analysisResult={analysisResult} />
            </div>
          )}

          {activeView === 'users' && (
            <div className="fade-in">
              <UsersView sessions={sessions} analysisResult={analysisResult} />
            </div>
          )}

          {activeView === 'alerts' && (
            <div className="fade-in">
              <Alerts issues={analysisResult?.issues || []} sessions={sessions} />
            </div>
          )}

          {activeView === 'trends' && (
            <div className="fade-in">
              <Trends analysisResult={analysisResult} />
            </div>
          )}

          {activeView === 'locations' && (
            <div className="fade-in">
              <LocationsView sessions={sessions} analysisResult={analysisResult} />
            </div>
          )}

          {activeView === 'network' && (
            <div className="fade-in">
              <NetworkExperience analysisResult={analysisResult} />
            </div>
          )}

          {activeView === 'bootlogon' && (
            <div className="fade-in">
              <BootLogonView />
            </div>
          )}

          {activeView === 'stability' && (
            <div className="fade-in">
              <AppStabilityView analysisResult={analysisResult} />
            </div>
          )}

          {activeView === 'reports' && (
            <div className="fade-in">
              <ReportsView analysisResult={analysisResult} />
            </div>
          )}

          {activeView === 'admin' && (
            <div className="fade-in">
              <Admin 
                config={config}
                onConfigUpdate={setConfig}
                isAnalyzing={isAnalyzing}
                onAnalysisAction={handleRunAnalysis}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
