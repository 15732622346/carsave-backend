import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { User } from '../database/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      // 在开发环境中可以记录更详细的错误，或者提供一个默认值（不推荐用于生产）
      console.error(
        'JWT_SECRET is not defined in environment variables. Please check your .env file.',
      );
      throw new InternalServerErrorException(
        'JWT secret is missing. Server configuration error.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret, // Explicitly assert jwtSecret is non-null
    });
  }

  async validate(payload: {
    sub: number;
    openid: string;
  }): Promise<Partial<User>> {
    // payload 结构: { sub: userId (number), openid: userOpenid (string), iat: ..., exp: ... }
    // console.log('[JwtStrategy] Validating payload:', payload);
    if (!payload || !payload.sub) {
      throw new UnauthorizedException(
        'Invalid token payload: missing subject (user ID).',
      );
    }
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found or token invalid');
    }
    // User entity already excludes sensitive fields like password or session_key (they are not part of the entity)
    // We return the user object as fetched from the service.
    // If userService.findById returns more fields than needed, they can be stripped here.
    // For now, assume userService.findById returns an appropriate User object subset.
    // Example: remove openid if you don't want it in req.user, though it's often useful.
    // const { openid, ...safeUser } = user;
    // return safeUser;
    return user; // The User entity itself should be safe to return to req.user
  }
}
