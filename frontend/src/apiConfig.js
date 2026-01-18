// Centralized API base URL configuration
// Priority: REACT_APP_API_URL (for production), otherwise sensible defaults

const isLocalHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

// If REACT_APP_API_URL is set, always prefer that.
// Otherwise:
//  - In local dev, default to http://localhost:5000
//  - In deployed environments, default to the Render backend URL
export const API_URL =
  process.env.REACT_APP_API_URL ||
  (isLocalHost ? 'http://localhost:5000' : 'https://cropflow-backend.onrender.com');

// Helper to build full image URLs from backend paths
export const buildImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return `${API_URL}${imagePath}`;
};
