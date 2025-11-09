import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const BASE_URL = 'http://0.0.0.0:5000';
let API_KEY = 'pk_8d30a1a3dab08a57dfa98f11601ec7665bc3628b57b56c4e8f517cd98968010b'; // Will be set by user

interface Project {
  id: number;
  name: string;
  slug: string;
  description: string;
}

interface Prompt {
  id: number;
  slug: string;
  content: string;
  version: number;
}

interface PromptVersion {
  id: number;
  promptId: number;
  version: number;
  content: string;
  message: string;
  createdAt: string;
}

describe('PromptVault API Tests', () => {
  let testProjectSlug: string;
  let testPromptSlug: string;

  beforeAll(() => {
    // User should set API_KEY before running tests
    // API_KEY = process.env.PROMPTVAULT_API_KEY || '';
    if (!API_KEY) {
      throw new Error('PROMPTVAULT_API_KEY environment variable must be set');
    }

    // Generate unique identifiers for this test run
    const timestamp = Date.now();
    testProjectSlug = `test-project-${timestamp}`;
    testPromptSlug = `test-prompt-${timestamp}`;
  });

  describe('Project Endpoints', () => {
    it('should create a new project', async () => {
      const response = await fetch(`${BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          name: 'Test Project',
          slug: testProjectSlug,
          description: 'A test project for API testing',
        }),
      });

      expect(response.status).toBe(201);
      const data: Project = await response.json();
      expect(data.slug).toBe(testProjectSlug);
      expect(data.name).toBe('Test Project');
      expect(data.description).toBe('A test project for API testing');
    });

    it('should fail to create project without API key', async () => {
      const response = await fetch(`${BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Project',
          slug: 'test-no-auth',
          description: 'Should fail',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should fail to create duplicate project slug', async () => {
      const response = await fetch(`${BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          name: 'Duplicate Project',
          slug: testProjectSlug,
          description: 'Should fail due to duplicate slug',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should list all projects', async () => {
      const response = await fetch(`${BASE_URL}/api/projects`, {
        headers: {
          'x-api-key': API_KEY,
        },
      });

      expect(response.status).toBe(200);
      const data: Project[] = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.some(p => p.slug === testProjectSlug)).toBe(true);
    });
  });

  describe('Prompt Endpoints', () => {
    it('should create a new prompt', async () => {
      const response = await fetch(`${BASE_URL}/api/prompts/${testPromptSlug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          projectSlug: testProjectSlug,
          content: 'You are a helpful AI assistant that helps with ${task}.',
          message: 'Initial version',
        }),
      });

      expect(response.status).toBe(201);
      const data: PromptVersion = await response.json();
      expect(data.version).toBe(1);
      expect(data.content).toContain('${task}');
      expect(data.message).toBe('Initial version');
    });

    it('should fail to create prompt without API key', async () => {
      const response = await fetch(`${BASE_URL}/api/prompts/unauthorized-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectSlug: testProjectSlug,
          content: 'Should fail',
          message: 'Unauthorized',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should get the latest prompt version', async () => {
      const response = await fetch(
        `${BASE_URL}/api/prompts/${testPromptSlug}?projectSlug=${testProjectSlug}`,
        {
          headers: {
            'x-api-key': API_KEY,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.content).toContain('${task}');
      expect(data.slug).toBe(testPromptSlug);
    });

    it('should fail to get prompt without API key', async () => {
      const response = await fetch(
        `${BASE_URL}/api/prompts/${testPromptSlug}?projectSlug=${testProjectSlug}`
      );

      expect(response.status).toBe(401);
    });

    it('should create a second version of the prompt', async () => {
      const response = await fetch(`${BASE_URL}/api/prompts/${testPromptSlug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          projectSlug: testProjectSlug,
          content: 'You are an expert AI assistant specializing in ${domain}. Help the user with ${task}.',
          message: 'Added domain specialization',
        }),
      });

      expect(response.status).toBe(201);
      const data: PromptVersion = await response.json();
      expect(data.version).toBe(2);
      expect(data.content).toContain('${domain}');
      expect(data.message).toBe('Added domain specialization');
    });

    it('should get a specific prompt version', async () => {
      const response = await fetch(
        `${BASE_URL}/api/prompts/${testPromptSlug}?projectSlug=${testProjectSlug}&version=1`,
        {
          headers: {
            'x-api-key': API_KEY,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.content).toContain('${task}');
      expect(data.content).not.toContain('${domain}');
    });

    it('should get the latest version when no version specified', async () => {
      const response = await fetch(
        `${BASE_URL}/api/prompts/${testPromptSlug}?projectSlug=${testProjectSlug}`,
        {
          headers: {
            'x-api-key': API_KEY,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.content).toContain('${domain}');
      expect(data.latestVersion).toBe(2);
    });

    it('should list all versions of a prompt', async () => {
      const response = await fetch(
        `${BASE_URL}/api/prompts/${testPromptSlug}/versions?projectSlug=${testProjectSlug}`,
        {
          headers: {
            'x-api-key': API_KEY,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: PromptVersion[] = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
      expect(data[0].version).toBe(1);
      expect(data[1].version).toBe(2);
    });

    it('should return 404 for non-existent prompt', async () => {
      const response = await fetch(
        `${BASE_URL}/api/prompts/non-existent-prompt?projectSlug=${testProjectSlug}`,
        {
          headers: {
            'x-api-key': API_KEY,
          },
        }
      );

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent version', async () => {
      const response = await fetch(
        `${BASE_URL}/api/prompts/${testPromptSlug}?projectSlug=${testProjectSlug}&version=999`,
        {
          headers: {
            'x-api-key': API_KEY,
          },
        }
      );

      expect(response.status).toBe(404);
    });

    it('should list prompts in a project', async () => {
      const response = await fetch(
        `${BASE_URL}/api/projects/${testProjectSlug}/prompts`,
        {
          headers: {
            'x-api-key': API_KEY,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: Prompt[] = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.some(p => p.slug === testPromptSlug)).toBe(true);
    });
  });

  describe('Variable Rendering', () => {
    it('should handle prompts with template variables', async () => {
      const response = await fetch(
        `${BASE_URL}/api/prompts/${testPromptSlug}?projectSlug=${testProjectSlug}`,
        {
          headers: {
            'x-api-key': API_KEY,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.content).toContain('${domain}');
      expect(data.content).toContain('${task}');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing project slug', async () => {
      const response = await fetch(
        `${BASE_URL}/api/prompts/${testPromptSlug}`,
        {
          headers: {
            'x-api-key': API_KEY,
          },
        }
      );

      expect(response.status).toBe(400);
    });

    it('should handle invalid API key', async () => {
      const response = await fetch(
        `${BASE_URL}/api/prompts/${testPromptSlug}?projectSlug=${testProjectSlug}`,
        {
          headers: {
            'x-api-key': 'invalid_key',
          },
        }
      );

      expect(response.status).toBe(401);
    });

    it('should reject empty prompt content', async () => {
      const response = await fetch(`${BASE_URL}/api/prompts/empty-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          projectSlug: testProjectSlug,
          content: '',
          message: 'Empty content',
        }),
      });

      expect(response.status).toBe(400);
    });
  });
});