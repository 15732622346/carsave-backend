import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_data_backup')
export class UserDataBackup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_email', type: 'varchar', length: 100, unique: true, comment: '用户邮箱（唯一）' })
  userEmail: string;

  @Column({ name: 'minio_url', type: 'varchar', length: 255, comment: 'MinIO文件URL' })
  minioUrl: string;

  @Column({ name: 'upload_time', type: 'datetime', comment: '最近上传时间' })
  uploadTime: Date;

  @Column({ name: 'upload_count', type: 'int', default: 0, comment: '当天上传次数' })
  uploadCount: number;

  @Column({ name: 'download_time', type: 'datetime', nullable: true, comment: '最近下载时间' })
  downloadTime: Date;

  @Column({ name: 'download_count', type: 'int', default: 0, comment: '当天下载次数' })
  downloadCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', comment: '记录创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', comment: '记录更新时间' })
  updatedAt: Date;
} 