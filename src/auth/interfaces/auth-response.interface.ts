import { User } from '../../database/entities/user.entity'; // 假设用户实体路径

export interface AuthResponse {
  statusCode: number;
  message: string;
  data?: {
    token?: string;
    user?: Partial<User>;
    requiresProfile?: boolean; // 指示是否需要用户提供profile信息
  };
}
