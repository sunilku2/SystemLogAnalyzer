#!/bin/bash
# Start Ollama service in the background
ollama serve &
# Wait a few seconds to ensure Ollama is up (optional, adjust as needed)
sleep 5
# Start the Python API server (in foreground)
exec python api_server.py