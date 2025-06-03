import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataBackupController } from './data-backup.controller';
import { DataBackupService } from './data-backup.service';
import { UserDataBackup } from '../database/entities/user-data-backup.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserDataBackup])],
  controllers: [DataBackupController],
  providers: [DataBackupService],
})
export class DataBackupModule {} 