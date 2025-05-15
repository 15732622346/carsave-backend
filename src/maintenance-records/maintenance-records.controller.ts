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
import { MaintenanceRecordsService } from './maintenance-records.service';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('maintenance_records')
@UseGuards(AuthGuard('jwt'))
export class MaintenanceRecordsController {
  private readonly logger = new Logger(MaintenanceRecordsController.name);

  constructor(private readonly recordsService: MaintenanceRecordsService) {}

  @Post()
  create(@Body() createDto: CreateMaintenanceRecordDto) {
    this.logger.log(`Request to create maintenance record: ${JSON.stringify(createDto)}`);
    return this.recordsService.create(createDto);
  }

  @Get()
  findAll(
    // Query parameters to filter records, e.g., by vehicleId or componentId
    @Query('vehicleId') vehicleId?: string,
    @Query('componentId') componentId?: string,
    @Query('vehicleName') vehicleName?: string, // From HomeView.vue
  ) {
    this.logger.log(`Request to find all maintenance records. Query: vehicleId=${vehicleId}, componentId=${componentId}, vehicleName=${vehicleName}`);
    const vehicleIdNum = vehicleId ? parseInt(vehicleId, 10) : undefined;
    const componentIdNum = componentId ? parseInt(componentId, 10) : undefined;
    // Add warnings or BadRequestException for invalid parseInt results if needed

    return this.recordsService.findAll(vehicleIdNum, componentIdNum, vehicleName);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Request to find maintenance record with ID: ${id}`);
    return this.recordsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMaintenanceRecordDto,
  ) {
    this.logger.log(`Request to update maintenance record ${id} with: ${JSON.stringify(updateDto)}`);
    return this.recordsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Request to delete maintenance record ${id}`);
    return this.recordsService.remove(id);
  }
} 