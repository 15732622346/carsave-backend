import { Controller, Post, Get, UseGuards, UploadedFile, UseInterceptors, Req, Res, HttpException, HttpStatus, HttpCode } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DataBackupService } from './data-backup.service';
import { Request, Response } from 'express';

@Controller('data-backup')
export class DataBackupController {
  constructor(private readonly dataBackupService: DataBackupService) {}

  // 上传接口
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  async uploadBackup(@UploadedFile() file: any, @Req() req: Request) {
    const userEmail = (req.user as any)?.email;
    if (!userEmail) {
      throw new HttpException('未登录或邮箱缺失', HttpStatus.UNAUTHORIZED);
    }
    try {
      return await this.dataBackupService.uploadBackup(file, userEmail);
    } catch (e) {
      if (e.status === 403 || e.status === 401) {
        throw new HttpException(e.message || '鉴权失败，请重新登录', e.status);
      }
      throw e;
    }
  }

  // 下载接口
  @UseGuards(JwtAuthGuard)
  @Get('download')
  async downloadBackup(@Req() req: Request, @Res() res: Response) {
    const userEmail = (req.user as any)?.email;
    if (!userEmail) {
      throw new HttpException('未登录或邮箱缺失', HttpStatus.UNAUTHORIZED);
    }
    try {
      return await this.dataBackupService.downloadBackup(userEmail, res);
    } catch (e) {
      if (e.status === 403 || e.status === 401) {
        throw new HttpException(e.message || '鉴权失败，请重新登录', e.status);
      }
      throw e;
    }
  }
} 