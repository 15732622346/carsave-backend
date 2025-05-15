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
    this.logger.log('AuthService initialized with JwtService.');
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
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.configService.get<string>('WECHAT_APP_ID')}&secret=${this.configService.get<string>('WECHAT_APP_SECRET')}&js_code=${code}&grant_type=authorization_code`;
      this.logger.debug(`Requesting WeChat session from URL: ${url}`);
      
      this.logger.debug(`Attempting to call actual WeChat API.`);
      const response = await firstValueFrom(
        this.httpService.get<WxSession>(url),
      );
      wxSession = response.data;
      this.logger.debug(`Actual WeChat session response: ${JSON.stringify(wxSession)}`);

      if (wxSession.errcode) {
        this.logger.error(`WeChat API Error: ${wxSession.errmsg} (code: ${wxSession.errcode})`);
        throw new HttpException(
          `WeChat API Error: ${wxSession.errmsg}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!wxSession.openid) {
        this.logger.error('OpenID not found in WeChat session response. Cannot proceed.');
        throw new HttpException('Failed to get OpenID from WeChat.', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      this.logger.log(`Successfully obtained openid: ${wxSession.openid}`);

      this.logger.log(`Checking for user with openid: ${wxSession.openid}`);
      let user: User | null = null;
      const userExistsMock = Math.random() > 0.5; 
      if (userExistsMock) {
        user = { 
          id: Math.floor(Math.random() * 1000) + 1,
          openid: wxSession.openid,
          nickName: 'Mocked Existing User',
          avatarUrl: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.logger.log(`User found with openid ${wxSession.openid}. User ID: ${user.id}`);
      } else {
        this.logger.log(`User with openid ${wxSession.openid} not found. Simulating creation.`);
        user = { 
            id: Math.floor(Math.random() * 1000) + 1001, 
            openid: wxSession.openid,
            nickName: `NewUser_${wxSession.openid.slice(-4)}`,
            avatarUrl: '',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.logger.log(`Simulated new user creation for openid ${wxSession.openid}. New User ID: ${user.id}`);
      }

      this.logger.log(`Preparing to generate JWT for user ID: ${user.id}, openid: ${user.openid}`);
      const payload = { sub: user.id, openid: user.openid };
      const token = await this.jwtService.signAsync(payload);
      this.logger.log(`Generated JWT successfully.`); // 不直接打印token，太长
      
      this.logger.log(`Login process successful for openid: ${wxSession.openid}. User ID: ${user.id}`);
      return {
        statusCode: HttpStatus.OK,
        message: 'Login successful (real JWT generated, simulated user check)',
        data: {
          token: token, // 返回真实的 JWT
          user: user as User,
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