// Express `Request` augmentation for auth-middleware.ts's `req.userId`.
// Kept alongside the middleware it belongs to; picked up automatically
// since tsconfig `include` covers all of `src`.

declare namespace Express {
  interface Request {
    userId?: number;
  }
}
