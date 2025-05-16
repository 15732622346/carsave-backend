import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  ParseIntPipe,
  Logger,
  Request,
} from '@nestjs/common';
import { MaintenanceComponentsService } from './maintenance-components.service';
import { CreateMaintenanceComponentDto } from './dto/create-maintenance-component.dto';
import { UpdateMaintenanceComponentDto } from './dto/update-maintenance-component.dto';
import { AuthGuard } from '@nestjs/passport';
// import { GetUser } from '../auth/get-user.decorator'; // If you have a decorator to get user from request
// import { User } from '../database/entities/user.entity';

@Controller('maintenance_components')
@UseGuards(AuthGuard('jwt'))
export class MaintenanceComponentsController {
  private readonly logger = new Logger(MaintenanceComponentsController.name);

  constructor(private readonly componentsService: MaintenanceComponentsService) {}

  @Post()
  create(
    @Body() createDto: CreateMaintenanceComponentDto,
    // @GetUser() user: User, // Example: if components are user-specific via User relation not Vehicle
  ) {
    this.logger.log(`Request to create maintenance component: ${JSON.stringify(createDto)}`);
    // If components are directly tied to a user (besides through a vehicle),
    // you might pass user.id to the service here.
    return this.componentsService.create(createDto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('vehicleId') vehicleId?: string, 
  ) { 
    const userId = req.user.id;
    this.logger.log(`Request to find all maintenance components for user ${userId}. Query: vehicleId=${vehicleId}`);
    let vehicleIdNum: number | undefined = undefined;
    if (vehicleId) {
      vehicleIdNum = parseInt(vehicleId, 10);
      if (isNaN(vehicleIdNum)) {
        this.logger.warn('Invalid vehicleId query parameter for user ${userId}, it was NaN. Ignoring vehicleId filter.');
        vehicleIdNum = undefined; // Reset to undefined if parsing failed
      }
    }
    return this.componentsService.findAll(userId, vehicleIdNum);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user.id;
    this.logger.log(`Request to find maintenance component with ID: ${id} for user ${userId}`);
    return this.componentsService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMaintenanceComponentDto,
  ) {
    this.logger.log(`Request to update maintenance component ${id} with: ${JSON.stringify(updateDto)}`);
    return this.componentsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Request to delete maintenance component ${id}`);
    return this.componentsService.remove(id);
  }
} 