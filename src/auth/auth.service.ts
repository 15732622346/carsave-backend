import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios'; // 用于发送 HTTP 请求
import { ConfigService } from '@nestjs/config'; // 用于读取配置 (AppID, AppSecret)
import { WxLoginDto } from './dto/wx-login.dto';
import { WxSession } from './interfaces/wx-session.interface';
import { AuthResponse } from './interfaces/auth-response.interface';
import { firstValueFrom } from 'rxjs';
// import { JwtService } from '@nestjs/jwt'; // 后续用于生成JWT
// import { UserService } from '../user/user.service'; // 假设有 UserService
// import { User } from '../database/entities/user.entity'; // 假设用户实体

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly WECHAT_APP_ID: string;
  private readonly WECHAT_APP_SECRET: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    // private readonly userService: UserService, // 注入 UserService
    // private readonly jwtService: JwtService,  // 注入 JwtService
  ) {
    // 从配置中获取 AppID 和 AppSecret，如果没有提供则使用占位符
    this.WECHAT_APP_ID = this.configService.get<string>('WECHAT_APP_ID') || 'YOUR_WECHAT_APP_ID';
    this.WECHAT_APP_SECRET = this.configService.get<string>('WECHAT_APP_SECRET') || 'YOUR_WECHAT_APP_SECRET';

    if (this.WECHAT_APP_ID === 'YOUR_WECHAT_APP_ID' || this.WECHAT_APP_SECRET === 'YOUR_WECHAT_APP_SECRET') {
      this.logger.warn('WeChat AppID or AppSecret is not configured. Using placeholders.');
    }
  }

  async wxLogin(wxLoginDto: WxLoginDto): Promise<AuthResponse> {
    const { code } = wxLoginDto;
    this.logger.log(`Attempting wxLogin with code: ${code}`);

    let wxSession: WxSession;
    try {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.WECHAT_APP_ID}&secret=${this.WECHAT_APP_SECRET}&js_code=${code}&grant_type=authorization_code`;
      this.logger.debug(`Requesting WeChat session: ${url}`);
      
      // 实际项目中，AppID 和 AppSecret 不应硬编码或使用简单占位符，而是通过 ConfigService 安全获取
      if (this.WECHAT_APP_ID === 'YOUR_WECHAT_APP_ID' || this.WECHAT_APP_SECRET === 'YOUR_WECHAT_APP_SECRET') {
        this.logger.warn("Using mocked WeChat API response due to missing AppID/Secret.");
        // 模拟微信API响应
        wxSession = {
          openid: `mock_openid_${Date.now()}`,
          session_key: `mock_session_key_${Date.now()}`,
        };
        if (code === 'errorcode') { // 模拟错误码
            wxSession.errcode = 40029;
            wxSession.errmsg = 'invalid code';
        }
      } else {
        const response = await firstValueFrom(
          this.httpService.get<WxSession>(url),
        );
        wxSession = response.data;
        this.logger.debug(`WeChat session response: ${JSON.stringify(wxSession)}`);
      }

      if (wxSession.errcode) {
        this.logger.error(`WeChat API Error: ${wxSession.errmsg} (code: ${wxSession.errcode})`);
        throw new HttpException(
          `WeChat API Error: ${wxSession.errmsg}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!wxSession.openid) {
        this.logger.error('OpenID not found in WeChat session response.');
        throw new HttpException('Failed to get OpenID from WeChat.', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // --- 用户查找/创建逻辑 (简化/占位) ---
      // let user: User = await this.userService.findByOpenid(wxSession.openid);
      // if (!user) {
      //   this.logger.log(`User with openid ${wxSession.openid} not found. Returning requiresProfile.`);
      //   // 对于新用户，可能需要前端引导获取用户信息后再注册
      //   // 或者在这里创建一个基础用户
      //   // user = await this.userService.createWithOpenid(wxSession.openid);
      //   // this.logger.log(`New user created with openid: ${user.openid}`);
      //   return {
      //     statusCode: HttpStatus.OK,
      //     message: 'User not found, profile information required.',
      //     data: { requiresProfile: true, openid: wxSession.openid } // 传递 openid 供后续注册使用
      //   };
      // }
      // this.logger.log(`User found: ${user.id}`);

      // --- 生成 Token (简化/占位) ---
      // const payload = { sub: user.id, openid: user.openid };
      // const token = await this.jwtService.signAsync(payload);
      
      // 模拟返回，实际应包含真实用户信息和token
      const mockUser = { id: 'mockUserId', openid: wxSession.openid, nickName: 'Mock User' };
      const mockToken = 'mock_jwt_token_' + Date.now();

      return {
        statusCode: HttpStatus.OK,
        message: 'Login successful (mocked)',
        data: {
          token: mockToken,
          user: mockUser as any, // 类型断言，因为User实体未完全定义
        },
      };

    } catch (error) {
      this.logger.error(`wxLogin failed: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Internal server error during WeChat login.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 后续可以添加 wxRegister, updateUserProfile 等方法
} 