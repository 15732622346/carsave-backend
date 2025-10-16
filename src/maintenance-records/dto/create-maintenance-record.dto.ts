import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class CreateMaintenanceRecordDto {
  @IsNumber()
  @IsNotEmpty()
  vehicle_id: number;

  @IsNumber()
  @IsNotEmpty()
  component_id: number; // ID of the MaintenanceComponent

  @IsDateString() // Expects YYYY-MM-DD format
  @IsNotEmpty()
  maintenance_date: string;

  @IsNumber()
  @IsNotEmpty()
  mileage_at_maintenance: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  component_name?: string;

  // Fields like cost, location, etc., can be added as needed
}
