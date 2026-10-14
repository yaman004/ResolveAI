export class AppError extends Error {
  constructor(status, message, code = 'ERROR', details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = true;
  }
}

export const badRequest = (msg, code = 'BAD_REQUEST', details) => new AppError(400, msg, code, details);
export const unauthorized = (msg = 'Authentication required', code = 'UNAUTHENTICATED') => new AppError(401, msg, code);
export const forbidden = (msg = 'You do not have permission to do that', code = 'FORBIDDEN') => new AppError(403, msg, code);
export const notFound = (msg = 'Not found', code = 'NOT_FOUND') => new AppError(404, msg, code);
export const conflict = (msg, code = 'CONFLICT') => new AppError(409, msg, code);
