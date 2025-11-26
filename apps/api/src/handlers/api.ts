import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import serverless from 'serverless-http';
import app from '../app.js';

// Create serverless handler with Lambda-specific options
const serverlessHandler = serverless(app, {
  // Binary MIME types for proper handling
  binary: ['image/*', 'application/pdf'],
});

/**
 * Lambda handler for API Gateway
 * Wraps Express app with serverless-http
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Don't wait for event loop to be empty before freezing process
  context.callbackWaitsForEmptyEventLoop = false;

  // Handle the request
  const result = await serverlessHandler(event, context);

  return result as APIGatewayProxyResult;
};

export default handler;
