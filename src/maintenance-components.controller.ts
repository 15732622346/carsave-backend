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
  UseGuards,
  Request,
} from '@nestjs/common';
import { MaintenanceComponentsService } from './maintenance-components.service';
import { CreateMaintenanceComponentDto } from './dto/create-maintenance-component.dto';
import { UpdateMaintenanceComponentDto } from './dto/update-maintenance-component.dto';
import { IsNumber, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/users/user.entity';

// Define a DTO for the /maintain endpoint body
class MaintainComponentDto {
  @IsNumber()
  @IsNotEmpty()
  currentMileage: number;

  @IsBoolean()
  @IsOptional()
  recalculateNextTarget?: boolean = true; // Default to true if not provided
}

@UseGuards(AuthGuard('jwt'))
@Controller('maintenance_components')
export class MaintenanceComponentsController {
  constructor(private readonly componentsService: MaintenanceComponentsService) {}

  @Post()
  create(@Body() createDto: CreateMaintenanceComponentDto, @Request() req: { user: User }) {
    return this.componentsService.create(createDto, req.user);
  }

  @Get()
  findAll(@Request() req: { user: User }, @Query('vehicle') vehicleName?: string) {
    return this.componentsService.findAll(req.user.id, vehicleName);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: { user: User }) {
    return this.componentsService.findOne(id, req.user.id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMaintenanceComponentDto,
    @Request() req: { user: User },
  ) {
    return this.componentsService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: { user: User }) {
    return this.componentsService.remove(id, req.user.id);
  }

  @Patch(':id/maintain')
  markAsMaintained(
    @Param('id', ParseIntPipe) id: number,
    @Body() maintainDto: MaintainComponentDto,
    @Request() req: { user: User },
  ) {
    return this.componentsService.markAsMaintained(
      id,
      maintainDto.currentMileage,
      maintainDto.recalculateNextTarget,
      req.user.id,
    );
  }
}
