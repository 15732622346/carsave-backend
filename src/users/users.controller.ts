import { Controller, Post, Body, ValidationPipe, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { UsersService } from './users.service';

// DTO for request body validation (optional but recommended)
class WechatLoginDto {
  // Uncomment if class-validator is used
  // import { IsString, IsNotEmpty } from 'class-validator';
  // @IsString()
  // @IsNotEmpty()
  code: string;
}

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post('auth/wechat/login')
  @HttpCode(HttpStatus.OK)
  async wechatLogin(@Body() loginDto: WechatLoginDto) {
    this.logger.log(`控制器收到微信登录请求，code: ${loginDto.code}`);
    
    try {
      const result = await this.usersService.wechatLogin(loginDto.code);
      this.logger.log(`微信登录成功，用户ID: ${result.user.id}`);
      return result;
    } catch (error) {
      this.logger.error(`微信登录失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
