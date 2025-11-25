/**
 * Swagger UI Setup
 * Configures and serves the interactive API documentation
 */

import { Express, Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

// Swagger UI configuration options
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai',
    },
    tryItOutEnabled: true,
    requestSnippetsEnabled: true,
    requestSnippets: {
      generators: {
        curl_bash: {
          title: 'cURL (bash)',
          syntax: 'bash',
        },
        curl_powershell: {
          title: 'cURL (PowerShell)',
          syntax: 'powershell',
        },
        curl_cmd: {
          title: 'cURL (CMD)',
          syntax: 'bash',
        },
        node_native: {
          title: 'Node.js (fetch)',
          syntax: 'javascript',
        },
      },
      defaultExpanded: true,
      languages: null,
    },
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { font-size: 2rem }
    .swagger-ui .scheme-container { background: #f7f7f7; padding: 20px; }
    .swagger-ui .opblock-tag { font-size: 1.1rem; border-bottom: 1px solid #eee; }
    .swagger-ui .opblock .opblock-summary-operation-id { font-size: 12px; }
    .swagger-ui .markdown p { margin: 10px 0; }
  `,
  customSiteTitle: 'Debt Resolution Platform - API Documentation',
  customfavIcon: '/favicon.ico',
};

/**
 * Setup Swagger documentation routes
 */
export function setupSwagger(app: Express): void {
  // Serve Swagger UI at /api-docs
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)
  );

  // Serve raw OpenAPI spec as JSON
  app.get('/api-docs.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve raw OpenAPI spec as YAML
  app.get('/api-docs.yaml', (req: Request, res: Response) => {
    const yaml = require('js-yaml');
    res.setHeader('Content-Type', 'text/yaml');
    res.send(yaml.dump(swaggerSpec));
  });

  // Redirect root API docs to Swagger UI
  app.get('/docs', (req: Request, res: Response) => {
    res.redirect('/api-docs');
  });

  console.log('📚 Swagger documentation available at /api-docs');
}

/**
 * Middleware to add OpenAPI info to response headers
 */
export function openApiHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-API-Docs', '/api-docs');
  next();
}

export default setupSwagger;
