import { DbHealthStatus } from '../interface/db.interface';

export interface DbCheckResponseDto extends DbHealthStatus {
  requestId?: string;
}
