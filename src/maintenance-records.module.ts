import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceRecord } from './database/entities/maintenance-record.entity';
import { Vehicle } from './database/entities/vehicle.entity';
import { MaintenanceComponent } from './database/entities/maintenance-component.entity';
import { MaintenanceRecordsController } from './maintenance-records.controller';
import { MaintenanceRecordsService } from './maintenance-records/maintenance-records.service';
// Import related entities for potential validation/logic later

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaintenanceRecord,
      MaintenanceComponent, // Needed to validate component_id
      Vehicle, // Needed to validate vehicle_id
    ]),
  ],
  controllers: [MaintenanceRecordsController],
  providers: [MaintenanceRecordsService],
  exports: [MaintenanceRecordsService],
})
export class MaintenanceRecordsModule {}
