/**
 * API Documentation Module
 * Exports Swagger/OpenAPI configuration and setup functions
 */

export { swaggerSpec, swaggerOptions } from './swagger';
export { setupSwagger, openApiHeadersMiddleware } from './swaggerSetup';

/**
 * Example usage in Express app:
 *
 * ```typescript
 * import express from 'express';
 * import { setupSwagger, openApiHeadersMiddleware } from './docs';
 *
 * const app = express();
 *
 * // Add OpenAPI headers to all responses
 * app.use(openApiHeadersMiddleware);
 *
 * // Setup Swagger UI at /api-docs
 * setupSwagger(app);
 *
 * // Your routes here...
 * ```
 *
 * Documentation will be available at:
 * - /api-docs - Interactive Swagger UI
 * - /api-docs.json - OpenAPI spec in JSON format
 * - /api-docs.yaml - OpenAPI spec in YAML format
 */
