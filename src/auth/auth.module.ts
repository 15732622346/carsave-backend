import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config'; // 确保 ConfigModule 在这里或全局导入
// import { UserModule } from '../user/user.module'; // 如果有单独的 UserModule
// import { JwtModule } from '@nestjs/jwt'; // 后续用于JWT

@Module({
  imports: [
    HttpModule, // 用于 AuthService 中的 HttpService
    ConfigModule, // 用于 AuthService 读取配置 (如果 AppID 等通过 .env 管理)
    // UserModule, // 如果用户逻辑在单独模块
    // JwtModule.registerAsync({ // JWT 配置示例
    //   imports: [ConfigModule],
    //   useFactory: async (configService: ConfigService) => ({
    //     secret: configService.get<string>('JWT_SECRET'),
    //     signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN', '3600s') },
    //   }),
    //   inject: [ConfigService],
    // }),
  ],
  controllers: [AuthController],
  providers: [AuthService /*, JwtStrategy 可能在这里或全局*/],
  // exports: [AuthService] // 如果其他模块需要使用 AuthService
})
export class AuthModule {} 