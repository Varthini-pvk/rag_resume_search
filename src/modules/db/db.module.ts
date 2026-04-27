import { AppConfig } from '../../config';
import { ILogger } from '../shared/logger';
import { DBController } from './controller/db.controller';
import { createDBRoutes } from './route/db.route';
import { DBService } from './service/db.service';

export class DBModule {
  private readonly service: DBService;
  private readonly controller: DBController;

  constructor(config: AppConfig, logger: ILogger) {
    this.service = new DBService(config, logger);
    this.controller = new DBController(this.service);
  }

  getService(): DBService {
    return this.service;
  }

  getController(): DBController {
    return this.controller;
  }

  createRoutes() {
    return createDBRoutes(this.controller);
  }
}
