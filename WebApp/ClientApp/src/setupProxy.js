const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy all API requests to Python backend
  // http-proxy-middleware strips the matched path (/api), so we need to add it back
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      pathRewrite: (path, req) => {
        // Prefix with /api since the middleware strips it
        return '/api' + path;
      },
      onError: (err, req, res) => {
        console.error('Proxy error for', req.url, ':', err.message);
        res.status(500).json({
          error: 'Could not connect to API server',
          message: 'Make sure the Python API server is running on port 5000'
        });
      }
    })
  );
};
