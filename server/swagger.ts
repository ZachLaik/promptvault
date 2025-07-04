import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Prompt Manager API',
      version: '1.0.0',
      description: 'A lightweight, multi-tenant Prompt Manager for versioned prompt storage and API access',
    },
    servers: [
      {
        url: 'https://c8c51686-0d9b-4c30-bcd2-157601544ed8-00-gf8yvovkz2td.riker.replit.dev',
        description: 'Replit development server',
      },
      {
        url: 'https://c8c51686-0d9b-4c30-bcd2-157601544ed8-00-gf8yvovkz2td.riker.replit.dev',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            slug: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Prompt: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            projectId: { type: 'integer' },
            slug: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        PromptVersion: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            promptId: { type: 'integer' },
            version: { type: 'integer' },
            content: { type: 'string' },
            message: { type: 'string' },
            authorId: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            lastUsedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ProjectMember: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            projectId: { type: 'integer' },
            userId: { type: 'integer' },
            role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
            joinedAt: { type: 'string', format: 'date-time' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        },
        SignupRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', minLength: 3 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        },
        CreateProjectRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
          },
        },
        CreatePromptRequest: {
          type: 'object',
          required: ['slug', 'title'],
          properties: {
            slug: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
          },
        },
        CreatePromptVersionRequest: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string' },
            message: { type: 'string' },
          },
        },
        CreateApiKeyRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
          },
        },
        InviteMemberRequest: {
          type: 'object',
          required: ['email', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
          },
        },
      },
    },
  },
  apis: ['./server/routes.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Prompt Manager API Docs',
  }));
}