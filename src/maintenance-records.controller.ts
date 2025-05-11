import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { MaintenanceRecordsService } from './maintenance-records.service';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';

@Controller('maintenance_records')
export class MaintenanceRecordsController {
  constructor(private readonly recordsService: MaintenanceRecordsService) {}

  @Post()
  create(@Body() createDto: CreateMaintenanceRecordDto) {
    // TODO: Add ValidationPipe
    return this.recordsService.create(createDto);
  }

  @Get()
  findAll(
    @Query('vehicleId', new ParseIntPipe({ optional: true })) vehicleId?: number,
    @Query('componentId', new ParseIntPipe({ optional: true })) componentId?: number,
  ) {
    console.log(`[MaintenanceRecordsController] findAll - Received query params vehicleId: ${vehicleId}, componentId: ${componentId}`);
    return this.recordsService.findAll(vehicleId, componentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recordsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMaintenanceRecordDto,
  ) {
    // TODO: Add ValidationPipe
    return this.recordsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.recordsService.remove(id);
  }
}
