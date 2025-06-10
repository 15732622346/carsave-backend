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
  create(
    @Body() createDto: CreateMaintenanceRecordDto,
    @Request() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    this.logger.log(
      `Request to create maintenance record for user ${userId}: ${JSON.stringify(createDto)}`,
    );
    return this.recordsService.create(createDto, userId);
  }

  @Get()
  findAll(
    @Request() req: { user: { id: number } },
    @Query('vehicleId') vehicleId?: string,
    @Query('componentId') componentId?: string,
  ) {
    const userId = req.user.id;
    this.logger.log(
      `Request to find all maintenance records for user ${userId}. Query: vehicleId=${vehicleId}, componentId=${componentId}`,
    );

    let vehicleIdNum: number | undefined = undefined;
    if (vehicleId) {
      vehicleIdNum = parseInt(vehicleId, 10);
      if (isNaN(vehicleIdNum)) {
        this.logger.warn(
          `Invalid vehicleId query parameter for user ${userId}: ${vehicleId}. Ignoring filter.`,
        );
        vehicleIdNum = undefined;
      }
    }

    let componentIdNum: number | undefined = undefined;
    if (componentId) {
      componentIdNum = parseInt(componentId, 10);
      if (isNaN(componentIdNum)) {
        this.logger.warn(
          `Invalid componentId query parameter for user ${userId}: ${componentId}. Ignoring filter.`,
        );
        componentIdNum = undefined;
      }
    }
    return this.recordsService.findAll(userId, vehicleIdNum, componentIdNum);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    this.logger.log(
      `Request to find maintenance record with ID: ${id} for user ${userId}`,
    );
    return this.recordsService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMaintenanceRecordDto,
    @Request() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    this.logger.log(
      `Request to update maintenance record ${id} for user ${userId} with: ${JSON.stringify(updateDto)}`,
    );
    return this.recordsService.update(id, updateDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    this.logger.log(
      `Request to delete maintenance record ${id} for user ${userId}`,
    );
    return this.recordsService.remove(id, userId);
  }
}
