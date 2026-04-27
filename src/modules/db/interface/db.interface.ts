import { Db } from 'mongodb';

export interface DbHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
}

export interface IDBService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  checkHealth(): Promise<DbHealthStatus>;
  isConnected(): boolean;
  getDb(): Db;
}
