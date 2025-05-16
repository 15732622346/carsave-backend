import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsDate,
  IsString,
  Min,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';

export class CreateMaintenanceRecordDto {
  @IsInt()
  @IsNotEmpty()
  vehicle_id: number;

  @IsInt()
  @IsNotEmpty()
  component_id: number;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  maintenance_date: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mileage_at_maintenance?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
