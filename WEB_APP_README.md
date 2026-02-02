# Log Analyzer - Enterprise Web Application
## AI-Powered Log Analysis with Modern UI

---

## 🎯 System Overview

This is a completely redesigned enterprise log analysis system featuring:
- **AI/LLM Integration** - Uses Ollama or LM Studio for intelligent analysis
- **Modern Web UI** - Professional React-based dashboard
- **.NET Core Backend** - Scalable ASP.NET Core web application  
- **Python API** - High-performance log processing engine
- **Real-time Analytics** - Interactive charts and insights
- **Industry-Standard Design** - Professional UI matching enterprise standards

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Browser                         │
│              (React Frontend - Port 3000)                │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              .NET Web Application                        │
│           (ASP.NET Core - Port 5001)                     │
│         [Proxy Controller + Static Files]                │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│            Python REST API                               │
│          (Flask API - Port 5000)                         │
│    [Log Parser + Issue Detector + LLM Analyzer]          │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│         Local LLM (Ollama/LM Studio)                     │
│           (Port 11434 or 1234)                           │
│          [llama3.2, mistral, phi3, etc.]                 │
└──────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

### Required Software:
1. **Python 3.8+** - Backend API
2. **.NET 8.0 SDK** - Web application
3. **Node.js 18+** - React frontend
4. **Ollama** OR **LM Studio** - Local LLM (optional but recommended)

### Install Ollama (Recommended):
```bash
# Windows
winget install Ollama.Ollama

# Or download from: https://ollama.com/download

# After installation, pull a model:
ollama pull llama3.2:3b
ollama pull mistral
```

### Install LM Studio (Alternative):
Download from: https://lmstudio.ai/

---

## 🚀 Quick Start Guide

### Step 1: Install Python Dependencies
```bash
cd C:\Work\UserSystemLogAnalyzer
pip install -r requirements.txt
```

### Step 2: Start Python API Server
```bash
python api_server.py
```

The API will start on `http://localhost:5000`

### Step 3: Install .NET Dependencies (First Time Only)
```bash
cd WebApp\ClientApp
npm install
```

### Step 4: Run the Web Application

**Option A - Development Mode (Recommended for development):**
```bash
# Terminal 1 - Start .NET Backend
cd C:\Work\UserSystemLogAnalyzer\WebApp
dotnet run

# Terminal 2 - Start React Frontend
cd C:\Work\UserSystemLogAnalyzer\WebApp\ClientApp
npm start
```

**Option B - Production Build:**
```bash
cd C:\Work\UserSystemLogAnalyzer\WebApp
dotnet build
dotnet run
```

### Step 5: Access the Application
Open browser and navigate to:
- **Development**: `http://localhost:3000`
- **Production**: `https://localhost:5001`

---

## 🎨 Features

### 1. **AI-Powered Analysis**
- ✅ Select from multiple LLM models (llama3.2, mistral, phi3)
- ✅ Intelligent root cause identification
- ✅ Context-aware solution recommendations
- ✅ Fallback to pattern-based analysis

### 2. **Professional Dashboard**
- ✅ Real-time statistics and KPIs
- ✅ Interactive charts and visualizations
- ✅ Severity-based issue categorization
- ✅ User impact analysis

### 3. **Analytics**
- ✅ Category distribution charts
- ✅ Top affected users
- ✅ Severity trends
- ✅ Issue patterns over time

### 4. **Modern UI/UX**
- ✅ Responsive design (mobile-friendly)
- ✅ Industry-standard interface
- ✅ Smooth animations
- ✅ Professional color scheme
- ✅ Accessible design

---

## 📊 Using the Application

### Running Analysis:

1. **Navigate to "Run Analysis"** tab
2. **Configure Settings:**
   - Enable/Disable AI analysis
   - Select LLM provider (Ollama/LM Studio)
   - Choose model (llama3.2:3b recommended)
3. **Click "Start Analysis"**
4. **View Results** in Dashboard

### Understanding Results:

**Dashboard View:**
- Overview statistics
- Issues by severity
- Issues by category  
- Top 5 critical issues

**Issues View:**
- Complete list of all issues
- Filter by severity
- Sort by user count or occurrences
- Detailed issue information

**Analytics View:**
- Distribution charts
- User impact analysis
- Trend visualizations

---

## ⚙️ Configuration

### Python API (`config.py`):
```python
# LLM Configuration
LLM_ENABLED = True
LLM_PROVIDER = "ollama"  # or "lmstudio"
LLM_MODEL = "llama3.2:3b"

# Paths
LOGS_DIR = "path/to/logs"
REPORT_OUTPUT_DIR = "path/to/reports"
```

### .NET Application (`appsettings.json`):
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  },
  "AllowedHosts": "*",
  "PythonApi": {
    "BaseUrl": "http://localhost:5000"
  }
}
```

---

## 🔧 Development

### Project Structure:
```
UserSystemLogAnalyzer/
├── Python Backend/
│   ├── api_server.py          # REST API server
│   ├── llm_analyzer.py        # LLM integration
│   ├── log_parser.py          # Log processing
│   ├── issue_detector.py      # Pattern matching
│   └── config.py              # Configuration
│
├── WebApp/                    # .NET Application
│   ├── Program.cs             # .NET startup
│   ├── Controllers/           # API controllers
│   │   └── ProxyController.cs
│   └── ClientApp/             # React Frontend
│       ├── src/
│       │   ├── App.js         # Main app
│       │   ├── components/    # React components
│       │   │   ├── Dashboard.js
│       │   │   ├── AnalysisControl.js
│       │   │   ├── IssuesTable.js
│       │   │   └── Analytics.js
│       │   └── services/
│       │       └── api.js     # API client
│       └── package.json
│
└── analysis_logs/             # Log files
```

### Adding New Features:

**1. Add New LLM Provider:**
Edit `llm_analyzer.py`, add provider in `_get_base_url()` and `_call_llm()`

**2. Add New Issue Pattern:**
Edit `issue_detector.py`, add to `_load_issue_patterns()`

**3. Add New Dashboard Widget:**
Create component in `WebApp/ClientApp/src/components/`

---

## 🔌 API Endpoints

### Python API (Port 5000):
- `GET /api/health` - Health check
- `GET /api/models/available` - List available LLM models
- `GET /api/config` - Get configuration
- `GET /api/logs/sessions` - List log sessions
- `POST /api/analyze` - Run analysis
- `GET /api/reports/latest` - Get latest report

### .NET API (Port 5001):
- `GET /api/proxy/health` - Proxy to Python API
- `GET /api/proxy/models` - Get available models
- `GET /api/proxy/config` - Get configuration
- `GET /api/proxy/sessions` - Get log sessions
- `POST /api/proxy/analyze` - Run analysis
- `GET /api/proxy/latest-report` - Get latest report

---

## 🐛 Troubleshooting

### Issue: Python API not connecting
**Solution:**
```bash
# Check if API is running
curl http://localhost:5000/api/health

# Restart API
python api_server.py
```

### Issue: LLM models not loading
**Solution:**
```bash
# Verify Ollama is running
ollama list

# Pull model if missing
ollama pull llama3.2:3b

# Check LM Studio is running on port 1234
```

### Issue: React app not starting
**Solution:**
```bash
cd WebApp/ClientApp
rm -rf node_modules
npm install
npm start
```

### Issue: CORS errors
**Solution:**
- Ensure Python API has `flask-cors` installed
- Check `api_server.py` has CORS enabled
- Verify proxy settings in `package.json`

---

## 📦 Deployment

### Production Build:

1. **Build React Frontend:**
```bash
cd WebApp/ClientApp
npm run build
```

2. **Publish .NET Application:**
```bash
cd WebApp
dotnet publish -c Release -o publish
```

3. **Deploy:**
- Copy `publish/` folder to server
- Ensure Python API is running
- Configure IIS or Kestrel
- Set environment variables

### Environment Variables:
```bash
# Python
FLASK_ENV=production
LOG_ANALYZER_PORT=5000

# .NET
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=https://+:5001
```

---

## 🎓 Best Practices

1. **Always run analysis with LLM enabled** for better insights
2. **Use llama3.2:3b** for balance of speed and accuracy
3. **Monitor Python API logs** for errors
4. **Regularly update LLM models** in Ollama
5. **Backup analysis results** before re-running

---

## 📝 License

Internal use only. Proprietary software.

---

## 🆘 Support

For issues:
1. Check API health endpoints
2. Review Python API console logs
3. Check browser console (F12)
4. Verify LLM is running
5. Contact development team

---

**Version:** 2.0.0 (Web Edition)  
**Last Updated:** January 25, 2026  
**Status:** Production Ready with AI Integration
