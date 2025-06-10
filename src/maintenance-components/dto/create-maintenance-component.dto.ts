import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum MaintenanceType {
  MILEAGE = 'mileage',
  DATE = 'date',
}

export class CreateMaintenanceComponentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  vehicle_id: number; // Assuming this will be the ID of the related vehicle

  @IsEnum(MaintenanceType)
  @IsNotEmpty()
  maintenance_type: MaintenanceType;

  @IsNumber()
  @IsNotEmpty()
  maintenance_value: number; // e.g., 5000 (km) or 180 (days)

  @IsString()
  @IsNotEmpty()
  unit: string; // e.g., 'km', 'days' - could be inferred or validated against maintenance_type

  @IsNumber()
  @IsOptional()
  target_maintenance_mileage?: number;

  @IsString() // Assuming date is string YYYY-MM-DD
  @IsOptional()
  target_maintenance_date?: string;

  @IsNumber()
  @IsOptional()
  overall_target_mileage?: number;

  // Add other fields as necessary, like attention_threshold, warning_threshold, etc.
}
