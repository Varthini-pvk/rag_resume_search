import { Db, MongoClient } from 'mongodb';

import { AppConfig } from '../../../config';
import { ServiceError } from '../../shared/errors';
import { ILogger } from '../../shared/logger';
import { DbHealthStatus, IDBService } from '../interface/db.interface';

export class DBService implements IDBService {
  private client: MongoClient;
  private db: Db | null = null;
  private connected = false;

  constructor(
    private readonly config: AppConfig,
    private readonly logger: ILogger
  ) {
    this.client = new MongoClient(this.config.mongodb.uri, {
      connectTimeoutMS: this.config.mongodb.timeout,
      maxPoolSize: this.config.mongodb.maxPoolSize,
      minPoolSize: this.config.mongodb.minPoolSize,
    });
  }

  async connect(): Promise<void> {
    const startTime = Date.now();

    try {
      await this.client.connect();
      this.db = this.client.db();
      this.connected = true;

      this.logger.info({
        action: 'db_connected',
        module: 'db',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.connected = false;

      this.logger.error({
        action: 'db_connection_failed',
        module: 'db',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown DB connection error',
      });

      throw new ServiceError('DB_CONNECTION_FAILED', 'Failed to connect to MongoDB', 503);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    await this.client.close();
    this.connected = false;
    this.db = null;

    this.logger.info({
      action: 'db_disconnected',
      module: 'db',
    });
  }

  async checkHealth(): Promise<DbHealthStatus> {
    const startTime = Date.now();

    if (!this.connected || !this.db) {
      return {
        status: 'unhealthy',
        error: 'Database is not connected',
      };
    }

    try {
      await this.db.command({ ping: 1 });

      return {
        status: 'healthy',
        latency: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error({
        action: 'db_health_check_failed',
        module: 'db',
        error: error instanceof Error ? error.message : 'Unknown DB health check error',
      });

      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown DB health check error',
      };
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getDb(): Db {
    if (!this.db) {
      throw new ServiceError('DB_NOT_CONNECTED', 'Database not connected', 503);
    }

    return this.db;
  }
}
