
/**
 * PromptVault - JavaScript client for Prompt Manager API
 * 
 * Usage:
 *   import PromptVault from './promptvault.js';
 * 
 *   // Configure once
 *   const pv = new PromptVault({
 *     baseUrl: 'https://prompting-manager.replit.app',
 *     apiKey: 'your_api_key'
 *   });
 * 
 *   // Use elegant syntax to access prompts
 *   const prompt = await pv.agents_research-agents.research_manager();
 * 
 *   // Or access with strings if needed
 *   const prompt = await pv.getPrompt('research-manager', 'agents-research-agents');
 */

class PromptTemplate {
  constructor(content) {
    this.content = content;
  }

  /**
   * Render the prompt with variables using template literals
   * @param {Object} variables - Variable name-value pairs to substitute
   * @returns {string} The rendered prompt with variables substituted
   */
  render(variables = {}) {
    try {
      // Simple template replacement using ${variable} syntax
      return this.content.replace(/\$\{(\w+)\}/g, (match, key) => {
        if (variables.hasOwnProperty(key)) {
          return variables[key];
        }
        throw new Error(`Missing variable: ${key}`);
      });
    } catch (error) {
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Return raw content when used as string
   */
  toString() {
    return this.content;
  }
}

class PromptProxy {
  constructor(projectSlug, client) {
    this._projectSlug = projectSlug;
    this._client = client;
    
    // Return a Proxy to handle dynamic method calls
    return new Proxy(this, {
      get(target, prop) {
        if (typeof prop === 'string' && !prop.startsWith('_')) {
          // Convert python-style names to kebab-case for API
          const slug = prop.replace(/_/g, '-');
          return () => target._client.getPrompt(slug, target._projectSlug);
        }
        return target[prop];
      }
    });
  }
}

class PromptVault {
  constructor(config = {}) {
    this._config = {
      baseUrl: null,
      apiKey: null,
      ...config
    };

    // Return a Proxy to handle dynamic property access
    return new Proxy(this, {
      get(target, prop) {
        if (typeof prop === 'string' && !prop.startsWith('_') && !target[prop]) {
          // Convert python-style names to kebab-case for project slug
          const projectSlug = prop.replace(/_/g, '-');
          return new PromptProxy(projectSlug, target);
        }
        return target[prop];
      }
    });
  }

  /**
   * Configure PromptVault with your API credentials
   * @param {string} baseUrl - Your Prompt Manager base URL
   * @param {string} apiKey - Your API key from the Prompt Manager
   */
  configure(baseUrl, apiKey) {
    this._config.baseUrl = baseUrl.replace(/\/$/, '');
    this._config.apiKey = apiKey;
  }

  /**
   * Fetch a prompt from the Prompt Manager API
   * @param {string} slug - The prompt slug
   * @param {string} projectSlug - The project slug
   * @param {number} [version] - Optional version number (defaults to latest)
   * @returns {Promise<PromptTemplate>} A PromptTemplate object
   */
  async getPrompt(slug, projectSlug, version = null) {
    if (!this._config.baseUrl || !this._config.apiKey) {
      throw new Error('PromptVault not configured. Call configure() first.');
    }

    const params = new URLSearchParams({ projectSlug });
    if (version) {
      params.append('version', version.toString());
    }

    const url = `${this._config.baseUrl}/api/prompts/${slug}?${params}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': this._config.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 404) {
        throw new Error(`Prompt '${slug}' not found in project '${projectSlug}'`);
      } else if (response.status === 403) {
        throw new Error(`Access denied to project '${projectSlug}'`);
      } else if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return new PromptTemplate(data.content);

    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Network error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create a new version of a prompt
   * @param {string} slug - The prompt slug
   * @param {string} projectSlug - The project slug
   * @param {string} content - The prompt content
   * @param {string} [message] - Version commit message
   * @returns {Promise<Object>} The created prompt version
   */
  async createPromptVersion(slug, projectSlug, content, message = null) {
    if (!this._config.baseUrl || !this._config.apiKey) {
      throw new Error('PromptVault not configured. Call configure() first.');
    }

    const url = `${this._config.baseUrl}/api/prompts/${slug}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': this._config.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          message,
          projectSlug
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API request failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Network error: ${error.message}`);
      }
      throw error;
    }
  }
}

export default PromptVault;

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PromptVault;
}
