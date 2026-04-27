/**
 * Custom error for service layer
 */
export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ServiceError';
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}

/**
 * Custom error for validation failures
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Custom error for not found scenarios
 */
export class NotFoundError extends Error {
  constructor(
    public resource: string,
    public id: string,
    message?: string
  ) {
    super(message || `${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Convert error to standard error response
 */
export interface ErrorResponse {
  error: string;
  code: string;
  requestId?: string;
  timestamp: string;
  details?: Record<string, any>;
}

export function createErrorResponse(
  error: Error,
  requestId?: string
): ErrorResponse {
  if (error instanceof ServiceError) {
    return {
      error: error.message,
      code: error.code,
      requestId,
      timestamp: new Date().toISOString(),
      details: error.details,
    };
  }

  if (error instanceof ValidationError) {
    return {
      error: error.message,
      code: 'VALIDATION_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      details: {
        field: error.field,
        value: error.value,
      },
    };
  }

  if (error instanceof NotFoundError) {
    return {
      error: error.message,
      code: 'NOT_FOUND',
      requestId,
      timestamp: new Date().toISOString(),
      details: {
        resource: error.resource,
        id: error.id,
      },
    };
  }

  return {
    error: error.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId,
    timestamp: new Date().toISOString(),
  };
}
