import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';

// Validates request body against a Zod schema
export const validateBody = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
      return;
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
  };
};

// Validates request query parameters against a Zod schema
export const validateQuery = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
      return;
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed in query parameters',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      res.status(400).json({ error: 'Invalid query input' });
      return;
    }
  };
};
