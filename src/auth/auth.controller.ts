import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { WxLoginDto } from './dto/wx-login.dto';
import { AuthResponse } from './interfaces/auth-response.interface';
import { Public } from './decorators/public.decorator'; // 假设我们有一个 Public 装饰器允许匿名访问

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

  // 后续可以添加注册、获取用户信息等接口
  // @Post('wx-register')
  // async wxRegister(@Body() registerDto: any) {
  //   // ...
  // }
}
