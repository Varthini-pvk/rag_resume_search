import { NextFunction, Request, Response } from 'express';

import { DbCheckResponseDto } from '../dto/db.response.dto';
import { IDBService } from '../interface/db.interface';

export class DBController {
  constructor(private readonly dbService: IDBService) {}

  async checkConnection(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dbStatus = await this.dbService.checkHealth();

      const response: DbCheckResponseDto = {
        ...dbStatus,
        requestId: req.correlationId,
      };

      const statusCode = dbStatus.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(response);
    } catch (error) {
      next(error);
    }
  }
}
