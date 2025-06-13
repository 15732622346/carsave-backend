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
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcryptjs';
import { MailerService } from '@nestjs-modules/mailer';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly WECHAT_APP_ID: string;
  private readonly WECHAT_APP_SECRET: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly userService: UserService, // 注入 UserService (模拟)
    private readonly jwtService: JwtService, // 注入 JwtService
    private readonly mailerService: MailerService,
  ) {
    // this.logger.log('AuthService initialized with JwtService.');
    this.WECHAT_APP_ID =
      this.configService.get<string>('WECHAT_APP_ID') || 'YOUR_WECHAT_APP_ID';
    this.WECHAT_APP_SECRET =
      this.configService.get<string>('WECHAT_APP_SECRET') ||
      'YOUR_WECHAT_APP_SECRET';

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
      let user: User | null = await this.userService.findByOpenid(
        wxSession.openid,
      );

      if (!user) {
        // this.logger.log(`User with openid ${wxSession.openid} not found. Creating new user.`);
        // 微信登录时，如果用户不存在，通常会自动创建用户
        // 这里可以根据需要决定是否需要昵称、头像等信息，如果需要，通常从小程序端传递
        // const { userInfo } = wxLoginDto; // 假设 wxLoginDto 扩展了可以包含 userInfo
        // user = await this.userService.createWithOpenid(wxSession.openid, wxSession.session_key, userInfo);
        user = await this.userService.createWithOpenid(
          wxSession.openid,
          wxSession.session_key,
        );
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
    } catch (err: unknown) {
      let errorMessage = 'An unknown error occurred during wxLogin';
      let errorStack: string | undefined = undefined;

      if (err instanceof Error) {
        errorMessage = err.message;
        errorStack = err.stack;
      } else {
        errorMessage = String(err);
      }
      this.logger.error(`wxLogin failed: ${errorMessage}`, errorStack);

      if (err instanceof HttpException) {
        throw err; // Re-throw if it's already an HttpException
      }
      throw new HttpException(
        'Internal server error during WeChat login.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password } = registerDto;
    // 检查邮箱是否已注册
    const existUser = await this.userService.findByEmail(email);
    if (existUser) {
      throw new HttpException('邮箱已被注册', HttpStatus.BAD_REQUEST);
    }
    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.userService.createWithEmail(email, hashedPassword);
    const payload = { sub: user.id, email: user.email };
    const token = await this.jwtService.signAsync(payload);
    return {
      statusCode: HttpStatus.OK,
      message: '注册成功',
      data: {
        token,
        user,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      const { email, password } = loginDto;
      const user = await this.userService.findByEmail(email);
      if (!user || !user.password) {
        throw new HttpException({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: '邮箱或密码错误',
          error: 'Unauthorized'
        }, HttpStatus.UNAUTHORIZED);
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new HttpException({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: '邮箱或密码错误',
          error: 'Unauthorized'
        }, HttpStatus.UNAUTHORIZED);
      }
      const payload = { sub: user.id, email: user.email };
      const token = await this.jwtService.signAsync(payload);
      return {
        statusCode: HttpStatus.OK,
        message: '登录成功',
        data: {
          token,
          user,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: '登录过程中发生错误',
        error: 'Internal Server Error'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userService.findById(userId);
    if (!user || !user.password) {
      throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
    }

    const isMatch = await bcrypt.compare(changePasswordDto.oldPassword, user.password);
    if (!isMatch) {
      throw new HttpException('旧密码错误', HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.userService.updatePassword(userId, hashedPassword);

    return { message: '密码修改成功' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      return { message: '如果邮箱存在，验证码已发送' };
    }
    // 生成6位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10分钟有效
    await this.userService.saveResetCode(user.id, code, codeExpiry);
    // 发送验证码邮件
    await this.mailerService.sendMail({
      to: user.email,
      subject: '重置密码验证码',
      html: `<p>您的验证码是：<b>${code}</b>，10分钟内有效。如非本人操作请忽略。</p>`,
    });
    return { message: '如果邮箱存在，验证码已发送' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    const { email, code, newPassword } = resetPasswordDto as any;
    const user = await this.userService.findByEmailAndResetCode(email, code);
    if (!user) {
      return { success: false, message: '验证码错误' };
    }
    if (!user.resetCodeExpiry || user.resetCodeExpiry < new Date()) {
      return { success: false, message: '验证码已过期' };
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userService.updatePassword(user.id, hashedPassword);
    await this.userService.clearResetCode(user.id);
    return { success: true, message: '密码重置成功' };
  }

  // 后续可以添加 wxRegister, updateUserProfile 等方法
}
