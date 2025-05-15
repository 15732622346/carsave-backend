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
    @Query('vehicleId') vehicleId?: string, 
    @Query('vehicle') vehicleName?: string // Support for vehicle name from HomeView.vue
  ) { 
    this.logger.log(`Request to find all maintenance components. Query: vehicleId=${vehicleId}, vehicleName=${vehicleName}`);
    let vehicleIdNum: number | undefined = undefined;
    if (vehicleId) {
      vehicleIdNum = parseInt(vehicleId, 10);
      if (isNaN(vehicleIdNum)) {
        this.logger.warn('Invalid vehicleId query parameter, it was NaN. Ignoring vehicleId filter.');
        vehicleIdNum = undefined; // Reset to undefined if parsing failed
      }
    }
    return this.componentsService.findAll(vehicleIdNum, vehicleName);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Request to find maintenance component with ID: ${id}`);
    return this.componentsService.findOne(id);
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