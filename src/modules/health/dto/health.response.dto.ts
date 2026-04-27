import { HealthStatus } from './health.interface';

/**
 * Health check response DTO
 */
export interface HealthResponseDto extends HealthStatus {
  requestId?: string;
}
