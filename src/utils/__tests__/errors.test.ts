
import {
  AppError,
  AuthError,
  RateLimitError,
  ValidationError,
  NetworkError,
  handleError,
  isAppError,
  isRateLimitError,
} from '../errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create with message, code, and statusCode', () => {
      const error = new AppError('Test error', 'TEST_CODE', 500);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('AppError');
    });

    it('should be an instance of Error', () => {
      const error = new AppError('Test', 'CODE');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('AuthError', () => {
    it('should create with 401 status', () => {
      const error = new AuthError('Unauthorized');
      expect(error.message).toBe('Unauthorized');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthError');
    });

    it('should be an instance of AppError', () => {
      const error = new AuthError('Test');
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('RateLimitError', () => {
    it('should create with remaining time and 429 status', () => {
      const error = new RateLimitError(5);
      expect(error.message).toBe('Account locked. Try again in 5 minutes.');
      expect(error.code).toBe('RATE_LIMIT');
      expect(error.statusCode).toBe(429);
      expect(error.remainingTime).toBe(5);
      expect(error.name).toBe('RateLimitError');
    });
  });

  describe('ValidationError', () => {
    it('should create with 400 status', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
    });

    it('should support optional field name', () => {
      const error = new ValidationError('Required', 'email');
      expect(error.field).toBe('email');
    });

    it('should have undefined field when not provided', () => {
      const error = new ValidationError('Required');
      expect(error.field).toBeUndefined();
    });
  });

  describe('NetworkError', () => {
    it('should create with default message', () => {
      const error = new NetworkError();
      expect(error.message).toBe('Network error. Please check your connection.');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(503);
    });

    it('should accept custom message', () => {
      const error = new NetworkError('API down');
      expect(error.message).toBe('API down');
    });
  });
});

describe('handleError', () => {
  it('should return message from AppError', () => {
    const error = new AppError('Custom error', 'CODE');
    expect(handleError(error)).toBe('Custom error');
  });

  it('should return message from AuthError', () => {
    expect(handleError(new AuthError('Auth failed'))).toBe('Auth failed');
  });

  it('should return message from regular Error', () => {
    expect(handleError(new Error('Regular error'))).toBe('Regular error');
  });

  it('should handle Supabase invalid_credentials error', () => {
    const error = Object.assign(new Error('Bad creds'), { code: 'invalid_credentials' });
    expect(handleError(error)).toBe('Invalid email or password');
  });

  it('should handle Supabase email_not_confirmed error', () => {
    const error = Object.assign(new Error('Not confirmed'), { code: 'email_not_confirmed' });
    expect(handleError(error)).toBe('Please verify your email address');
  });

  it('should handle Supabase user_not_found error', () => {
    const error = Object.assign(new Error('Not found'), { code: 'user_not_found' });
    expect(handleError(error)).toBe('No account found with this email');
  });

  it('should handle unknown Supabase error codes', () => {
    const error = Object.assign(new Error('Something else'), { code: 'unknown_code' });
    expect(handleError(error)).toBe('Something else');
  });

  it('should handle string errors', () => {
    expect(handleError('Something went wrong')).toBe('Something went wrong');
  });

  it('should handle unknown error types', () => {
    expect(handleError(42)).toBe('An unexpected error occurred');
    expect(handleError(null)).toBe('An unexpected error occurred');
    expect(handleError(undefined)).toBe('An unexpected error occurred');
  });
});

describe('isAppError', () => {
  it('should return true for AppError', () => {
    expect(isAppError(new AppError('Test', 'CODE'))).toBe(true);
  });

  it('should return true for subclasses', () => {
    expect(isAppError(new AuthError('Test'))).toBe(true);
    expect(isAppError(new RateLimitError(5))).toBe(true);
    expect(isAppError(new ValidationError('Test'))).toBe(true);
    expect(isAppError(new NetworkError())).toBe(true);
  });

  it('should return false for regular Error', () => {
    expect(isAppError(new Error('Test'))).toBe(false);
  });

  it('should return false for non-errors', () => {
    expect(isAppError('string')).toBe(false);
    expect(isAppError(42)).toBe(false);
    expect(isAppError(null)).toBe(false);
  });
});

describe('isRateLimitError', () => {
  it('should return true for RateLimitError', () => {
    expect(isRateLimitError(new RateLimitError(5))).toBe(true);
  });

  it('should return false for other AppErrors', () => {
    expect(isRateLimitError(new AuthError('Test'))).toBe(false);
  });

  it('should return false for non-errors', () => {
    expect(isRateLimitError(new Error('Test'))).toBe(false);
  });
});
