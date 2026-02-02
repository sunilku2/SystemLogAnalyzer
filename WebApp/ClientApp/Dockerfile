FROM amr-registry.caas.intel.com/ao-ml-ai/cache/node:18-slim

# Set proxy environment variables for build stage
ENV http_proxy=http://proxy-dmz.intel.com:912
ENV https_proxy=http://proxy-dmz.intel.com:912
ENV HTTP_PROXY=http://proxy-dmz.intel.com:912
ENV HTTPS_PROXY=http://proxy-dmz.intel.com:912
# no_proxy=localhost,127.0.0.1,127.0.0.0/8,192.168.0.0/16
# NO_PROXY=localhost,127.0.0.1,127.0.0.0/8,192.168.0.0/16
ENV no_proxy=intel.com,localhost,127.0.0.1,127.0.0.0/8,192.168.0.0/16
ENV NO_PROXY=intel.com,localhost,127.0.0.1,127.0.0.0/8,192.168.0.0/16

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Expose the default port (React default is 3000)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
