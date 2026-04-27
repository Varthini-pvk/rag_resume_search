import { NextFunction, Request, Response, Router } from 'express';

import { DBController } from '../controller/db.controller';

export function createDBRoutes(controller: DBController): Router {
  const router = Router();

  router.get('/check', (req: Request, res: Response, next: NextFunction) =>
    controller.checkConnection(req, res, next)
  );

  return router;
}
