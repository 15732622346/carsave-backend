import {
  IsString,
  IsInt,
  IsOptional,
  IsDate,
  IsEnum,
  IsNumber,
  MaxLength,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaintenanceComponentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsInt()
  @IsNotEmpty()
  vehicle_id: number;

  @IsEnum(['mileage', 'date'])
  @IsNotEmpty()
  maintenance_type: 'mileage' | 'date';

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  maintenance_value: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  target_maintenance_mileage?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  target_maintenance_date?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  last_maintenance_date?: Date;
}
