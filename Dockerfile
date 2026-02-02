FROM amr-registry.caas.intel.com/ao-ml-ai/cache/python:3.12-slim

# Set proxy environment variables for build stage
ENV http_proxy=http://proxy-dmz.intel.com:912
ENV https_proxy=http://proxy-dmz.intel.com:912
ENV HTTP_PROXY=http://proxy-dmz.intel.com:912
ENV HTTPS_PROXY=http://proxy-dmz.intel.com:912
# no_proxy=localhost,127.0.0.1,127.0.0.0/8,192.168.0.0/16
# NO_PROXY=localhost,127.0.0.1,127.0.0.0/8,192.168.0.0/16
ENV no_proxy=intel.com,localhost,127.0.0.1,127.0.0.0/8,192.168.0.0/16
ENV NO_PROXY=intel.com,localhost,127.0.0.1,127.0.0.0/8,192.168.0.0/16

# Install Ollama
RUN apt-get update && apt-get install -y curl zstd
RUN curl -fsSL https://ollama.com/install.sh | bash
RUN /bin/bash -c "ollama pull llama3.2:3b || true"

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port (optional, e.g., 8000)
# EXPOSE 8000


# Start both Ollama and the API server
COPY start-all.sh /app/start-all.sh
RUN chmod +x /app/start-all.sh
CMD ["/app/start-all.sh"]