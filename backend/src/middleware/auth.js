/**
 * Authentication middleware
 * Provides functions for authenticating requests to protected routes
 */

// Simple middleware function that can be used for routes that need authentication
// Since we're not implementing real authentication in this example, this is just a placeholder
const authenticateToken = (req, res, next) => {
  // For development purposes, we'll just allow all requests to pass through
  // In a real application, this would verify a JWT token or other authentication method
  console.log('Auth middleware: Bypassing authentication for development');
  next();
};

module.exports = {
  authenticateToken
}; 