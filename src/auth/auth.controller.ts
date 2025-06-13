import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { WxLoginDto } from './dto/wx-login.dto';
import { AuthResponse } from './interfaces/auth-response.interface';
import { Public } from './decorators/public.decorator'; // 假设我们有一个 Public 装饰器允许匿名访问
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public() // 标记此接口为公开访问，不需要JWT验证 (后续如果添加了全局JWT守卫)
  @Post('wx-login')
  @HttpCode(HttpStatus.OK)
  async wxLogin(
    @Body(new ValidationPipe()) wxLoginDto: WxLoginDto,
  ): Promise<AuthResponse> {
    return this.authService.wxLogin(wxLoginDto);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(
    @Body(new ValidationPipe()) registerDto: RegisterDto,
  ): Promise<AuthResponse> { 
    console.log('收到注册请求:', registerDto);
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ValidationPipe()) loginDto: LoginDto,
  ): Promise<AuthResponse> {
    console.log('[Controller] 收到登录请求:', loginDto);
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req,
    @Body(new ValidationPipe()) changePasswordDto: ChangePasswordDto,
  ) {
    console.log(`[changePassword] 用户ID: ${req.user.id}, 请求体:`, changePasswordDto);
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body(new ValidationPipe()) forgotPasswordDto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body(new ValidationPipe()) resetPasswordDto: ResetPasswordDto,
  ) {
    console.log('追龙追龙 reset-password 接口收到请求:', JSON.stringify(resetPasswordDto));
    return this.authService.resetPassword(resetPasswordDto);
  }

  // 后续可以添加注册、获取用户信息等接口
  // @Post('wx-register')
  // async wxRegister(@Body() registerDto: any) {
  //   // ...
  // }
}
