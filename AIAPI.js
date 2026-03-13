/**
 * AI Scraper Client - Main Class
 * Digunakan untuk berkomunikasi dengan AI Scraper Server API
 */

class AIScraperClient {
  constructor(baseURL = 'http://16.79.192.14:5500') {
    this.baseURL = baseURL;
    this.timeout = 600000; // 10 minutes
  }

  /**
   * Check if server is healthy
   */
  async health() {
    return this._request('GET', '/api/health');
  }

  /**
   * Get available services
   */
  async getServices() {
    return this._request('GET', '/api/services');
  }

  /**
   * Query OpenAI
   */
  async queryOpenAI(prompt, mode = 'new') {
    return this._request('POST', '/api/openai', { prompt, mode });
  }

  /**
   * Query Grok
   */
  async queryGrok(prompt, mode = 'new') {
    return this._request('POST', '/api/grok', { prompt, mode });
  }

  /**
   * Query Qwen
   */
  async queryQwen(prompt, mode = 'new') {
    return this._request('POST', '/api/qwen', { prompt, mode });
  }

  /**
   * Query all services in parallel
   */
  async queryAll(prompt, mode = 'new') {
    return this._request('POST', '/api/query-all', { prompt, mode });
  }

  /**
   * Get queue status
   */
  async getQueueStatus() {
    return this._request('GET', '/api/queue/status');
  }

  /**
   * Get queue info
   */
  async getQueueInfo() {
    return this._request('GET', '/api/queue/info');
  }

  /**
   * Get queue stats
   */
  async getQueueStats() {
    return this._request('GET', '/api/queue/stats');
  }

  /**
   * Private method to handle requests
   * @param {string} method - HTTP method (GET, POST)
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body data
   * @returns {Promise<object>} Response data
   */
  async _request(method, endpoint, data = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (data && method === 'POST') {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(this.baseURL + endpoint, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = AIScraperClient;
