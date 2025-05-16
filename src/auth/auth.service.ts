import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios'; // 用于发送 HTTP 请求
import { ConfigService } from '@nestjs/config'; // 用于读取配置 (AppID, AppSecret)
import { WxLoginDto } from './dto/wx-login.dto';
import { WxSession } from './interfaces/wx-session.interface';
import { AuthResponse } from './interfaces/auth-response.interface';
import { firstValueFrom } from 'rxjs';
import { JwtService } from '@nestjs/jwt'; // 导入 JwtService
import { UserService } from '../user/user.service'; // 假设有 UserService
import { User } from '../database/entities/user.entity'; // 假设用户实体

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly WECHAT_APP_ID: string;
  private readonly WECHAT_APP_SECRET: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly userService: UserService, // 注入 UserService (模拟)
    private readonly jwtService: JwtService,  // 注入 JwtService
  ) {
    // this.logger.log('AuthService initialized with JwtService.');
    this.WECHAT_APP_ID = this.configService.get<string>('WECHAT_APP_ID') || 'YOUR_WECHAT_APP_ID';
    this.WECHAT_APP_SECRET = this.configService.get<string>('WECHAT_APP_SECRET') || 'YOUR_WECHAT_APP_SECRET';

    if (
      !process.env.WECHAT_APPID ||
      !process.env.WECHAT_APPSECRET ||
      process.env.WECHAT_APPID === 'YOUR_WECHAT_APPID' ||
      process.env.WECHAT_APPSECRET === 'YOUR_WECHAT_APPSECRET'
    ) {
      this.logger.warn(
        'WeChat AppID or AppSecret is not configured. wxLogin will use mock data.',
      );
    }
  }

  async wxLogin(wxLoginDto: WxLoginDto): Promise<AuthResponse> {
    const { code } = wxLoginDto;
    // this.logger.log(`Attempting wxLogin with code: ${code}`);

    let wxSession: WxSession;
    try {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.configService.get<string>('WECHAT_APP_ID')}&secret=${this.configService.get<string>('WECHAT_APP_SECRET')}&js_code=${code}&grant_type=authorization_code`;
      // this.logger.debug(`Requesting WeChat session from URL: ${url}`);
      
      // this.logger.debug(`Attempting to call actual WeChat API.`);
      const response = await firstValueFrom(
        this.httpService.get<WxSession>(url),
      );
      wxSession = response.data;
      // this.logger.debug(`Actual WeChat session response: ${JSON.stringify(wxSession)}`);

      if (wxSession.errcode) {
        this.logger.error(
          `WeChat API Error: ${wxSession.errmsg} (code: ${wxSession.errcode})`,
        );
        throw new HttpException(
          `WeChat API Error: ${wxSession.errmsg}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!wxSession.openid || !wxSession.session_key) {
        this.logger.error(
          'OpenID or SessionKey not found in WeChat session response. Cannot proceed.',
        );
        throw new HttpException(
          'Failed to retrieve OpenID or SessionKey from WeChat.',
          HttpStatus.BAD_REQUEST,
        );
      }
      // this.logger.log(`Successfully obtained openid: ${wxSession.openid} and session_key.`);

      // this.logger.log(`Checking for user with openid: ${wxSession.openid}`);
      let user: User | null = await this.userService.findByOpenid(wxSession.openid);

      if (!user) {
        // this.logger.log(`User with openid ${wxSession.openid} not found. Creating new user.`);
        // 微信登录时，如果用户不存在，通常会自动创建用户
        // 这里可以根据需要决定是否需要昵称、头像等信息，如果需要，通常从小程序端传递
        // const { userInfo } = wxLoginDto; // 假设 wxLoginDto 扩展了可以包含 userInfo
        // user = await this.userService.createWithOpenid(wxSession.openid, wxSession.session_key, userInfo);
        user = await this.userService.createWithOpenid(wxSession.openid, wxSession.session_key);
        // this.logger.log(`New user created with ID: ${user.id} for openid ${wxSession.openid}.`);
      } else {
        // this.logger.log(`User found with openid ${wxSession.openid}. User ID: ${user.id}`);
        // 可选：如果需要，可以在此处更新用户的 session_key 或其他信息
        // await this.userService.updateUserSessionKey(user.id, wxSession.session_key);
      }

      // this.logger.log(`Preparing to generate JWT for user ID: ${user.id}, openid: ${user.openid}`);
      const payload = { sub: user.id, openid: user.openid }; // 确保 payload 中包含 sub (userId)
      const token = await this.jwtService.signAsync(payload);
      // this.logger.log(`Generated JWT successfully.`);
      
      // this.logger.log(`Login process successful for openid: ${wxSession.openid}. User ID: ${user.id}`);
      return {
        statusCode: HttpStatus.OK,
        message: 'Login successful',
        data: {
          token: token,
          user: user, // 返回完整的用户对象 (TypeORM 实体)
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