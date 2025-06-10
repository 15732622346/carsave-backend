import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// Remove DataSource import if no longer needed directly
// import { DataSource } from 'typeorm';
import { Vehicle } from './database/entities/vehicle.entity';
// import { User } from './database/entities/user.entity'; // Import User if needed for relations or context
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles/vehicles.service';
// Remove token export
// export const VEHICLE_REPOSITORY = 'VEHICLE_REPOSITORY';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle])], // Keep this for TypeORM to know the entity
  controllers: [VehiclesController],
  providers: [VehiclesService], // Only provide the service
  exports: [VehiclesService], // Export only the service
})
export class VehiclesModule {}
