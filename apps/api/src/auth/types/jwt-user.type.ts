import { UserRole } from '../../users/user.entity';

export interface JwtUser {
  id: string;
  email: string;
  role: UserRole;
}
