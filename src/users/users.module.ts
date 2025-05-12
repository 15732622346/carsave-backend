import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: 'your-secret-key-here',
        signOptions: {
          expiresIn: '1d',
        },
      }),
    }),
    ConfigModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtStrategy],
  exports: [UsersService, TypeOrmModule, PassportModule, JwtModule],
})
export class UsersModule {}
