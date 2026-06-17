import { Request, Response, NextFunction, RequestHandler } from 'express';

// Wraps an async express route handler to pass errors to the next middleware
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
