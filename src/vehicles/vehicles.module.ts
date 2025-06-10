import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from '../database/entities/vehicle.entity';
// import { AuthModule } from '../auth/auth.module'; // 如果需要在这里导入 AuthModule 以使用 AuthGuard 等

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle]),
    // AuthModule, // 如果 VehiclesController 使用了 AuthGuard，PassportModule 通常在 AuthModule 中配置并导出，或者全局注册
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService], // 如果其他模块需要使用 VehiclesService
})
export class VehiclesModule {}
