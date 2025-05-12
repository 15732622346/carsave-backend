import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VehiclesModule } from './vehicles.module';
import { MaintenanceComponentsModule } from './maintenance-components.module';
import { MaintenanceRecordsModule } from './maintenance-records.module';
import { UsersModule } from './users/users.module';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';
import * as fs from 'fs';

// 直接读取环境变量文件进行调试
const envFilePath = path.join(process.cwd(), '.env.development');
console.log('环境文件路径检查:', envFilePath);
console.log('环境文件是否存在:', fs.existsSync(envFilePath));

// 如果文件存在，尝试直接读取内容
if (fs.existsSync(envFilePath)) {
  try {
    const envContent = fs.readFileSync(envFilePath, 'utf8');
    console.log('环境文件内容:', envContent);
  } catch (error) {
    console.error('读取环境文件失败:', error);
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.join(process.cwd(), '.env.development'),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<TypeOrmModuleOptions> => {
        // 直接从process.env读取，用于调试
        console.log('直接从process.env读取 DB_HOST:', process.env.DB_HOST);
        
        // 由于环境变量加载有问题，这里直接硬编码数据库连接参数
        const dbHost = '192.168.235.135'; // 直接使用硬编码值，而不是从环境变量获取
        const dbPort = 3306;
        const dbUsername = 'root';
        const dbPassword = '123456';
        const dbDatabase = 'carsave';

        console.log('\x1b[31m%s\x1b[0m', '大红大红 - 数据库配置信息:');
        console.log('\x1b[31m%s\x1b[0m', '====================================');
        console.log('\x1b[31m%s\x1b[0m', `环境文件路径: ${path.join(process.cwd(), '.env.development')}`);
        console.log('\x1b[31m%s\x1b[0m', `数据库主机: ${dbHost}`);
        console.log('\x1b[31m%s\x1b[0m', `数据库端口: ${dbPort}`);
        console.log('\x1b[31m%s\x1b[0m', `数据库用户: ${dbUsername}`);
        console.log('\x1b[31m%s\x1b[0m', `数据库名称: ${dbDatabase}`);
        console.log('\x1b[31m%s\x1b[0m', '====================================');

        const config: TypeOrmModuleOptions = {
          type: 'mysql',
          host: dbHost,
          port: dbPort,
          username: dbUsername,
          password: dbPassword,
          database: dbDatabase,
          autoLoadEntities: true,
          synchronize: false,
          logging: true,
          connectTimeout: 10000,
          extra: {
            connectionLimit: 10
          }
        };
        
        return config;
      },
    }),
    VehiclesModule,
    MaintenanceComponentsModule,
    MaintenanceRecordsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
