import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceComponentsController } from './maintenance-components.controller';
import { MaintenanceComponentsService } from './maintenance-components.service';
import { MaintenanceComponent } from '../database/entities/maintenance-component.entity';
import { Vehicle } from '../database/entities/vehicle.entity'; // Import Vehicle if service uses VehicleRepository
import { MaintenanceRecord } from '../database/entities/maintenance-record.entity'; // Import MaintenanceRecord
// import { AuthModule } from '../auth/auth.module'; // If guards are not global

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaintenanceComponent,
      Vehicle,
      MaintenanceRecord,
    ]), // Add MaintenanceRecord here
    // AuthModule, // PassportModule is usually configured in AuthModule and exported or global
  ],
  controllers: [MaintenanceComponentsController],
  providers: [MaintenanceComponentsService],
  exports: [MaintenanceComponentsService],
})
export class MaintenanceComponentsModule {}
