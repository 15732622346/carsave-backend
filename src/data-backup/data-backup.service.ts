import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDataBackup } from '../database/entities/user-data-backup.entity';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import * as dayjs from 'dayjs';

@Injectable()
export class DataBackupService {
  private minioClient: MinioClient;
  private minioBucket: string;
  private minioPublicEndpoint: string;

  constructor(
    @InjectRepository(UserDataBackup)
    private readonly backupRepo: Repository<UserDataBackup>,
    private readonly configService: ConfigService,
  ) {
    this.minioClient = new MinioClient({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') || '127.0.0.1',
      port: Number(this.configService.get<string>('MINIO_PORT') || 9000),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin',
    });
    this.minioBucket = this.configService.get<string>('MINIO_BUCKET_NAME') || 'carsave-backup';
    this.minioPublicEndpoint = this.configService.get<string>('MINIO_PUBLIC_ENDPOINT') || 'http://127.0.0.1:9000';
  }

  // 上传备份
  async uploadBackup(file: any, userEmail: string) {
    if (!file) {
      throw new HttpException('未上传文件', HttpStatus.BAD_REQUEST);
    }
    // 校验上传次数
    // const today = dayjs().format('YYYY-MM-DD');
    let record = await this.backupRepo.findOne({ where: { userEmail } });
    // if (record && dayjs(record.uploadTime).format('YYYY-MM-DD') === today && record.uploadCount >= 1) {
    //   throw new HttpException('今日上传次数已用完', HttpStatus.FORBIDDEN);
    // }
    // 删除旧文件
    if (record && record.minioUrl) {
      const oldFileName = record.minioUrl.split('/').pop();
      try {
        await this.minioClient.removeObject(this.minioBucket, oldFileName!);
      } catch (e) {
        // 忽略找不到文件的异常
      }
    }
    // 上传新文件
    const fileName = `${userEmail.replace(/@/g, '_at_')}_${Date.now()}.json`;
    await this.minioClient.putObject(this.minioBucket, fileName, file.buffer, file.mimetype);
    const minioUrl = `${this.minioPublicEndpoint}/${this.minioBucket}/${fileName}`;
    // 更新数据库
    if (!record) {
      record = this.backupRepo.create({
        userEmail,
        minioUrl,
        uploadTime: new Date(),
        uploadCount: 0,
        downloadCount: 0,
      });
    } else {
      record.minioUrl = minioUrl;
      record.uploadTime = new Date();
    }
    await this.backupRepo.save(record);
    return { message: '上传成功', url: minioUrl };
  }

  // 下载备份
  async downloadBackup(userEmail: string, res: any) {
    const today = dayjs().format('YYYY-MM-DD');
    const record = await this.backupRepo.findOne({ where: { userEmail } });
    if (!record || !record.minioUrl) {
      throw new HttpException('未找到云端备份', HttpStatus.NOT_FOUND);
    }
    // 获取文件名
    const fileName = record.minioUrl.split('/').pop();
    // 获取文件流
    const fileStream = await this.minioClient.getObject(this.minioBucket, fileName!);
    // 只保留更新时间
    record.downloadTime = new Date();
    await this.backupRepo.save(record);
    // 设置响应头并返回流
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    fileStream.pipe(res);
  }
} 