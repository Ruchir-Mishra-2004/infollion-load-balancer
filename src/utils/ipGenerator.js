/**
 * Utility functions for IP generation and manipulation
 */

/**
 * Generate a random IP address
 */
function generateRandomIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
}

/**
 * Validate if a string is a valid IP address
 */
function isValidIP(ip) {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return false;

  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Get IP from request (support X-Forwarded-For header for proxied requests)
 */
function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    '127.0.0.1'
  );
}

module.exports = {
  generateRandomIP,
  isValidIP,
  getClientIP
};
