import { Router, Request, Response, NextFunction } from 'express';
import { HealthController } from '../controller/health.controller';

/**
 * Create health routes
 */
export function createHealthRoutes(
  controller: HealthController
): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response, next: NextFunction) =>
    controller.getHealth(req, res, next)
  );

  return router;
}

export default createHealthRoutes;
