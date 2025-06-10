import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceRecordsController } from './maintenance-records.controller';
import { MaintenanceRecordsService } from './maintenance-records.service';
import { MaintenanceRecord } from '../database/entities/maintenance-record.entity';
// Import Vehicle and MaintenanceComponent if their repositories are used in the service
import { Vehicle } from '../database/entities/vehicle.entity';
import { MaintenanceComponent } from '../database/entities/maintenance-component.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaintenanceRecord,
      Vehicle, // Uncomment if VehicleRepository is injected in MaintenanceRecordsService
      MaintenanceComponent, // Uncomment if MaintenanceComponentRepository is injected
    ]),
  ],
  controllers: [MaintenanceRecordsController],
  providers: [MaintenanceRecordsService],
  exports: [MaintenanceRecordsService],
})
export class MaintenanceRecordsModule {}
