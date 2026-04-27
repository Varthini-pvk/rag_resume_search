/**
 * Health check interface
 */
export interface IHealthService {
  /**
   * Get current health status of all services
   * @returns Health status object with uptime and component statuses
   */
  getHealthStatus(): Promise<HealthStatus>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  components: {
    app: ComponentHealth;
    mongodb?: ComponentHealth;
  };
  version: string;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
}
