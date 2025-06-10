import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VehiclesModule } from './vehicles/vehicles.module';
import { MaintenanceComponentsModule } from './maintenance-components/maintenance-components.module';
import { MaintenanceRecordsModule } from './maintenance-records/maintenance-records.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { FeedbackModule } from './feedback/feedback.module';
import { DataBackupModule } from './data-backup/data-backup.module';

// Import Entities for TypeOrmModule
import { User } from './database/entities/user.entity';
import { Vehicle } from './database/entities/vehicle.entity';
import { MaintenanceComponent } from './database/entities/maintenance-component.entity';
import { MaintenanceRecord } from './database/entities/maintenance-record.entity';
import { Feedback } from './database/entities/feedback.entity';
import { UserDataBackup } from './database/entities/user-data-backup.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('TypeOrmConfig');
        const dbHost = configService.get<string>('DB_HOST');
        const dbPort = configService.get<number>('DB_PORT');
        const dbUsername = configService.get<string>('DB_USERNAME');
        const dbPassword = configService.get<string>('DB_PASSWORD');
        const dbDatabase = configService.get<string>('DB_DATABASE');

        logger.log(`DB_HOST: ${dbHost}`);
        logger.log(`DB_PORT: ${dbPort}`);
        logger.log(`DB_USERNAME: ${dbUsername}`);
        logger.log(`DB_DATABASE: ${dbDatabase}`);
        logger.log(`NODE_ENV: ${process.env.NODE_ENV}`);
        logger.log(
          `Attempting to load env file from: ${process.env.NODE_ENV === 'development' ? '.env.development' : '.env'}`,
        );

        console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
        console.log('process.env.DB_HOST:', process.env.DB_HOST);
        console.log('process.env.DB_PORT:', process.env.DB_PORT);
        console.log('process.env.DB_USERNAME:', process.env.DB_USERNAME);
        console.log('process.env.DB_PASSWORD:', process.env.DB_PASSWORD);
        console.log('process.env.DB_DATABASE:', process.env.DB_DATABASE);

        console.log(`大展大展 数据库连接信息：ip=${dbHost} 端口=${dbPort} 用户名=${dbUsername} 密码=${dbPassword}`);

        return {
          type: 'mysql',
          host: dbHost,
          port: dbPort,
          username: dbUsername,
          password: dbPassword,
          database: dbDatabase,
          entities: [User, Vehicle, MaintenanceComponent, MaintenanceRecord, Feedback, UserDataBackup],
          synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true),
          logging: true,
        };
      },
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST'),
          port: configService.get('MAIL_PORT'),
          secure: configService.get('MAIL_SECURE') === 'true',
          auth: {
            user: configService.get('MAIL_USER'),
            pass: configService.get('MAIL_PASS'),
          },
        },
        defaults: {
          from: `"车保管家" <${configService.get('MAIL_FROM')}>`,
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    VehiclesModule,
    MaintenanceComponentsModule,
    MaintenanceRecordsModule,
    FeedbackModule,
    DataBackupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
