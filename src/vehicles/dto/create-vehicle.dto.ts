import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  name: string;

  @IsNumber()
  mileage: number;

  @IsDateString()
  @IsOptional()
  manufacturing_date?: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  // @Matches(/^[A-Z0-9]{5,10}$/, { message: 'Plate number is invalid' }) // 示例正则，根据实际车牌规则调整
  plate_number?: string;

  @IsString()
  @IsOptional()
  image?: string; // URL or path to image
}
