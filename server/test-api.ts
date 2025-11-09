
import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'http://0.0.0.0:5000';
const API_KEY = 'pk_74b348f59c8ff951bcd1963054ef45ceee6e69d75dd9f2e008aef75f1da7cc97';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  message: string;
}

class PromptVaultTester {
  private client: AxiosInstance;
  private results: TestResult[] = [];
  private testProjectSlug = `test-project-${Date.now()}`;
  private testProjectId: number | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      validateStatus: () => true // Don't throw on any status
    });
  }

  private log(result: TestResult) {
    this.results.push(result);
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
  }

  // Test 1: Create Project
  async testCreateProject() {
    try {
      const response = await this.client.post('/api/projects', {
        name: 'Test Project',
        slug: this.testProjectSlug,
        description: 'A test project for API testing'
      });

      if (response.status === 200 || response.status === 201) {
        this.testProjectId = response.data.id;
        this.log({
          name: 'Create Project',
          status: 'PASS',
          message: `Project created with ID: ${response.data.id}`
        });
      } else {
        this.log({
          name: 'Create Project',
          status: 'FAIL',
          message: `Status ${response.status}: ${JSON.stringify(response.data)}`
        });
      }
    } catch (error: any) {
      this.log({
        name: 'Create Project',
        status: 'FAIL',
        message: error.message
      });
    }
  }

  // Test 2: Get Projects
  async testGetProjects() {
    try {
      const response = await this.client.get('/api/projects');

      if (response.status === 200 && Array.isArray(response.data)) {
        this.log({
          name: 'Get Projects',
          status: 'PASS',
          message: `Retrieved ${response.data.length} projects`
        });
      } else {
        this.log({
          name: 'Get Projects',
          status: 'FAIL',
          message: `Status ${response.status}: ${JSON.stringify(response.data)}`
        });
      }
    } catch (error: any) {
      this.log({
        name: 'Get Projects',
        status: 'FAIL',
        message: error.message
      });
    }
  }

  // Test 3: Create Prompt Version
  async testCreatePromptVersion() {
    try {
      const response = await this.client.post('/api/prompts/test-prompt', {
        content: 'You are a helpful assistant for {task}. Your expertise is in {domain}.',
        message: 'Initial test prompt with variables',
        projectSlug: this.testProjectSlug
      });

      if (response.status === 200 || response.status === 201) {
        this.log({
          name: 'Create Prompt Version',
          status: 'PASS',
          message: `Prompt created with version: ${response.data.version}`
        });
      } else {
        this.log({
          name: 'Create Prompt Version',
          status: 'FAIL',
          message: `Status ${response.status}: ${JSON.stringify(response.data)}`
        });
      }
    } catch (error: any) {
      this.log({
        name: 'Create Prompt Version',
        status: 'FAIL',
        message: error.message
      });
    }
  }

  // Test 4: Get Prompt (Latest Version)
  async testGetPromptLatest() {
    try {
      const response = await this.client.get('/api/prompts/test-prompt', {
        params: { projectSlug: this.testProjectSlug }
      });

      if (response.status === 200 && response.data.content) {
        this.log({
          name: 'Get Prompt (Latest)',
          status: 'PASS',
          message: `Retrieved prompt: ${response.data.content.substring(0, 50)}...`
        });
      } else {
        this.log({
          name: 'Get Prompt (Latest)',
          status: 'FAIL',
          message: `Status ${response.status}: ${JSON.stringify(response.data)}`
        });
      }
    } catch (error: any) {
      this.log({
        name: 'Get Prompt (Latest)',
        status: 'FAIL',
        message: error.message
      });
    }
  }

  // Test 5: Update Prompt (Create New Version)
  async testUpdatePrompt() {
    try {
      const response = await this.client.post('/api/prompts/test-prompt', {
        content: 'Updated: You are an expert {role} assistant specializing in {expertise}.',
        message: 'Updated prompt with new variables',
        projectSlug: this.testProjectSlug
      });

      if (response.status === 200 || response.status === 201) {
        this.log({
          name: 'Update Prompt',
          status: 'PASS',
          message: `New version created: ${response.data.version}`
        });
      } else {
        this.log({
          name: 'Update Prompt',
          status: 'FAIL',
          message: `Status ${response.status}: ${JSON.stringify(response.data)}`
        });
      }
    } catch (error: any) {
      this.log({
        name: 'Update Prompt',
        status: 'FAIL',
        message: error.message
      });
    }
  }

  // Test 6: Get Specific Version
  async testGetPromptVersion() {
    try {
      const response = await this.client.get('/api/prompts/test-prompt', {
        params: { 
          projectSlug: this.testProjectSlug,
          version: 1
        }
      });

      if (response.status === 200 && response.data.content) {
        this.log({
          name: 'Get Prompt (Specific Version)',
          status: 'PASS',
          message: `Retrieved version 1: ${response.data.content.substring(0, 50)}...`
        });
      } else {
        this.log({
          name: 'Get Prompt (Specific Version)',
          status: 'FAIL',
          message: `Status ${response.status}: ${JSON.stringify(response.data)}`
        });
      }
    } catch (error: any) {
      this.log({
        name: 'Get Prompt (Specific Version)',
        status: 'FAIL',
        message: error.message
      });
    }
  }

  // Test 7: List Prompts in Project
  async testListPrompts() {
    try {
      if (!this.testProjectId) {
        this.log({
          name: 'List Prompts in Project',
          status: 'FAIL',
          message: 'No project ID available'
        });
        return;
      }

      const response = await this.client.get(
        `/api/projects/${this.testProjectId}/prompts`
      );

      if (response.status === 200 && Array.isArray(response.data)) {
        this.log({
          name: 'List Prompts in Project',
          status: 'PASS',
          message: `Found ${response.data.length} prompts`
        });
      } else {
        this.log({
          name: 'List Prompts in Project',
          status: 'FAIL',
          message: `Status ${response.status}: ${JSON.stringify(response.data)}`
        });
      }
    } catch (error: any) {
      this.log({
        name: 'List Prompts in Project',
        status: 'FAIL',
        message: error.message
      });
    }
  }

  // Test 8: Create Multiple Prompts
  async testCreateMultiplePrompts() {
    const prompts = [
      {
        slug: 'system-prompt',
        content: 'You are a helpful AI assistant specialized in {domain}.',
        message: 'System prompt'
      },
      {
        slug: 'user-query-processor',
        content: 'Process the following user query and respond with {format}: {query}',
        message: 'User query processor'
      },
      {
        slug: 'error-handler',
        content: 'Handle the error: {error_message} with severity {severity}',
        message: 'Error handler prompt'
      }
    ];

    let successCount = 0;
    for (const prompt of prompts) {
      try {
        const response = await this.client.post(`/api/prompts/${prompt.slug}`, {
          content: prompt.content,
          message: prompt.message,
          projectSlug: this.testProjectSlug
        });

        if (response.status === 200 || response.status === 201) {
          successCount++;
        }
      } catch (error) {
        // Continue even if one fails
      }
    }

    this.log({
      name: 'Create Multiple Prompts',
      status: successCount === prompts.length ? 'PASS' : 'FAIL',
      message: `Created ${successCount}/${prompts.length} prompts`
    });
  }

  // Test 9: Invalid API Key
  async testInvalidApiKey() {
    try {
      const invalidClient = axios.create({
        baseURL: BASE_URL,
        headers: {
          'x-api-key': 'pk_invalid_key',
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      });

      const response = await invalidClient.get('/api/projects');

      if (response.status === 401 || response.status === 403) {
        this.log({
          name: 'Invalid API Key (Security)',
          status: 'PASS',
          message: 'Correctly rejected invalid API key'
        });
      } else {
        this.log({
          name: 'Invalid API Key (Security)',
          status: 'FAIL',
          message: `Should reject invalid key but got status ${response.status}`
        });
      }
    } catch (error: any) {
      this.log({
        name: 'Invalid API Key (Security)',
        status: 'FAIL',
        message: error.message
      });
    }
  }

  // Test 10: Missing API Key
  async testMissingApiKey() {
    try {
      const noKeyClient = axios.create({
        baseURL: BASE_URL,
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      });

      const response = await noKeyClient.get('/api/projects');

      if (response.status === 401 || response.status === 403) {
        this.log({
          name: 'Missing API Key (Security)',
          status: 'PASS',
          message: 'Correctly rejected request without API key'
        });
      } else {
        this.log({
          name: 'Missing API Key (Security)',
          status: 'FAIL',
          message: `Should reject missing key but got status ${response.status}`
        });
      }
    } catch (error: any) {
      this.log({
        name: 'Missing API Key (Security)',
        status: 'FAIL',
        message: error.message
      });
    }
  }

  // Test 11: Non-existent Prompt
  async testNonExistentPrompt() {
    try {
      const response = await this.client.get('/api/prompts/non-existent-prompt-12345', {
        params: { projectSlug: this.testProjectSlug }
      });

      if (response.status === 404) {
        this.log({
          name: 'Non-existent Prompt',
          status: 'PASS',
          message: 'Correctly returned 404 for non-existent prompt'
        });
      } else {
        this.log({
          name: 'Non-existent Prompt',
          status: 'FAIL',
          message: `Expected 404 but got status ${response.status}`
        });
      }
    } catch (error: any) {
      this.log({
        name: 'Non-existent Prompt',
        status: 'FAIL',
        message: error.message
      });
    }
  }

  // Test 12: Get API Keys
  async testGetApiKeys() {
    try {
      const response = await this.client.get('/api/api-keys');

      if (response.status === 200 && Array.isArray(response.data)) {
        this.log({
          name: 'Get API Keys',
          status: 'PASS',
          message: `Retrieved ${response.data.length} API keys`
        });
      } else {
        this.log({
          name: 'Get API Keys',
          status: 'FAIL',
          message: `Status ${response.status}: ${JSON.stringify(response.data)}`
        });
      }
    } catch (error: any) {
      this.log({
        name: 'Get API Keys',
        status: 'FAIL',
        message: error.message
      });
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('\n=== Starting PromptVault API Tests ===\n');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
    console.log(`Test Project Slug: ${this.testProjectSlug}\n`);

    // Core functionality tests
    await this.testCreateProject();
    await this.testGetProjects();
    await this.testCreatePromptVersion();
    await this.testGetPromptLatest();
    await this.testUpdatePrompt();
    await this.testGetPromptVersion();
    await this.testListPrompts();
    await this.testCreateMultiplePrompts();

    // Security tests
    await this.testInvalidApiKey();
    await this.testMissingApiKey();

    // Error handling tests
    await this.testNonExistentPrompt();

    // Additional endpoint tests
    await this.testGetApiKeys();

    this.printSummary();
  }

  private printSummary() {
    console.log('\n=== Test Summary ===\n');
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

    if (failed > 0) {
      console.log('Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
    }
  }
}

// Run tests
const tester = new PromptVaultTester();
tester.runAllTests().catch(console.error);
