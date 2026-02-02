const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy all API requests to Python backend
  // In development, use environment variable or default to localhost:5000
  const apiTarget = process.env.REACT_APP_API_TARGET || 'http://localhost:5000';
  
  // http-proxy-middleware strips the matched path (/api), so we need to add it back
  app.use(
    '/api',
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: true,
      pathRewrite: (path, req) => {
        // Prefix with /api since the middleware strips it
        return '/api' + path;
      },
      onError: (err, req, res) => {
        console.error('Proxy error for', req.url, ':', err.message);
        res.status(500).json({
          error: 'Could not connect to API server',
          message: `Make sure the Python API server is running at ${apiTarget}`
        });
      }
    })
  );
};

