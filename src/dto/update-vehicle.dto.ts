import { PartialType } from '@nestjs/mapped-types'; // Use mapped-types for Update DTO
import { CreateVehicleDto } from './create-vehicle.dto';

// Update DTO inherits validation rules from Create DTO
// All fields become optional
export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {} 