/**
 * FinPocket API Client
 * Centralized API communication with JWT token management
 */

const API_BASE_URL = 'http://localhost:8080/api';

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/auth/login')
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Parsed JSON response
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getToken();

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    // Attach JWT token if available
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);

        // Handle 401 - Unauthorized (expired/invalid token)
        if (response.status === 401) {
            clearAuthData();
            window.location.href = '/login.html';
            throw new Error('Session expired. Please login again.');
        }

        // Handle 403 - Forbidden
        if (response.status === 403) {
            throw new Error('You do not have permission to access this resource.');
        }

        // Parse response
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        return data;
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Unable to connect to the server. Please ensure the backend is running.');
        }
        throw error;
    }
}

/**
 * GET request
 */
async function apiGet(endpoint) {
    return apiRequest(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
async function apiPost(endpoint, data) {
    return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * PUT request
 */
async function apiPut(endpoint, data) {
    return apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * DELETE request
 */
async function apiDelete(endpoint) {
    return apiRequest(endpoint, { method: 'DELETE' });
}

/* Token helpers used by this module - delegated to auth.js */
function getToken() {
    return localStorage.getItem('fp_token');
}

function clearAuthData() {
    localStorage.removeItem('fp_token');
    localStorage.removeItem('fp_user');
}
