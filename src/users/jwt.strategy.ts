import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { User } from './user.entity';

export interface JwtPayload {
  openid: string; 
  // sub: number; // Or typically 'sub' for subject (userId)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findUserByOpenidForAuth(payload.openid); // Renamed for clarity
    if (!user) {
      throw new UnauthorizedException('User not found or token invalid');
    }
    return user;
  }
} 