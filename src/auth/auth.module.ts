import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config'; // 确保 ConfigModule 在这里或全局导入
import { UserModule } from '../user/user.module'; // 导入 UserModule
import { JwtModule } from '@nestjs/jwt'; // 导入 JwtModule

@Module({
  imports: [
    HttpModule, // 用于 AuthService 中的 HttpService
    ConfigModule, // 用于 AuthService 读取配置 (如果 AppID 等通过 .env 管理)
    UserModule, // 添加 UserModule 到 imports
    JwtModule.registerAsync({ // JWT 配置
      imports: [ConfigModule], // 确保 ConfigService 可用
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN', '3600s') }, // 默认1小时
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService /*, JwtStrategy 可能在这里或全局*/],
  // exports: [AuthService] // 如果其他模块需要使用 AuthService
})
export class AuthModule {} 