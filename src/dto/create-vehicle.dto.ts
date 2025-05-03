import { Type } from 'class-transformer';
import {
  IsString,
  IsInt,
  IsOptional,
  IsDate,
  IsUrl,
  MaxLength,
  Min,
  IsNotEmpty,
  IsDateString,
} from 'class-validator'; // We'll add validation later

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  mileage: number;

  @IsOptional()
  @IsDateString()
  manufacturing_date?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(1024)
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  plate_number?: string;
} 