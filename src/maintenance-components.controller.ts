import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { MaintenanceComponentsService } from './maintenance-components.service';
import { CreateMaintenanceComponentDto } from './dto/create-maintenance-component.dto';
import { UpdateMaintenanceComponentDto } from './dto/update-maintenance-component.dto';
import { IsNumber, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

// Define a DTO for the /maintain endpoint body
class MaintainComponentDto {
  @IsNumber()
  @IsNotEmpty()
  currentMileage: number;

  @IsBoolean()
  @IsOptional()
  recalculateNextTarget?: boolean = true; // Default to true if not provided
}

@Controller('maintenance_components')
export class MaintenanceComponentsController {
  constructor(private readonly componentsService: MaintenanceComponentsService) {}

  @Post()
  create(@Body() createDto: CreateMaintenanceComponentDto) {
    // TODO: Add ValidationPipe
    return this.componentsService.create(createDto);
  }

  @Get()
  findAll(@Query('vehicleName') vehicleName?: string) {
    // Pass vehicleName directly to the service
    return this.componentsService.findAll(vehicleName);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.componentsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMaintenanceComponentDto,
  ) {
    // TODO: Add ValidationPipe
    return this.componentsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.componentsService.remove(id);
  }

  @Patch(':id/maintain') // Add PATCH route for marking as maintained
  markAsMaintained(
    @Param('id', ParseIntPipe) id: number,
    @Body() maintainDto: MaintainComponentDto, // Use the new DTO
  ) {
    return this.componentsService.markAsMaintained(
      id,
      maintainDto.currentMileage,
      maintainDto.recalculateNextTarget
    );
  }
}
