import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
};
