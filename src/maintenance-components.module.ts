import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceComponent } from './database/entities/maintenance-component.entity';
import { Vehicle } from './database/entities/vehicle.entity'; // Un-comment vehicle import
// import { Vehicle } from './database/entities/vehicle.entity'; // May need later for validation
import { MaintenanceComponentsController } from './maintenance-components.controller';
import { MaintenanceComponentsService } from './maintenance-components.service';
import { MaintenanceRecordsModule } from './maintenance-records.module'; // Import the other module

@Module({
  imports: [
    TypeOrmModule.forFeature([MaintenanceComponent, Vehicle]), // Add Vehicle here
    forwardRef(() => MaintenanceRecordsModule), // Import with forwardRef
  ],
  controllers: [MaintenanceComponentsController],
  providers: [MaintenanceComponentsService],
  exports: [MaintenanceComponentsService] // Also export this service if Records module needs it
})
export class MaintenanceComponentsModule {}
