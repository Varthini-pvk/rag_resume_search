import { HealthStatus } from '../interface/health.interface';

/**
 * Health check response DTO
 */
export interface HealthResponseDto extends HealthStatus {
  requestId?: string;
}
