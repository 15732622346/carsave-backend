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

// Import Entities for TypeOrmModule
import { User } from './database/entities/user.entity';
import { Vehicle } from './database/entities/vehicle.entity';
import { MaintenanceComponent } from './database/entities/maintenance-component.entity';
import { MaintenanceRecord } from './database/entities/maintenance-record.entity';

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

        return {
          type: 'mysql',
          host: dbHost,
          port: dbPort,
          username: dbUsername,
          password: dbPassword,
          database: dbDatabase,
          entities: [User, Vehicle, MaintenanceComponent, MaintenanceRecord],
          synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true),
          logging: true,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    VehiclesModule,
    MaintenanceComponentsModule,
    MaintenanceRecordsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
