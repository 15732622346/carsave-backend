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
    @Query('vehicleName') vehicleName?: string,
    @Query('componentId') componentId?: string,
  ) {
    const componentIdNum = componentId ? parseInt(componentId, 10) : undefined;
    if (componentIdNum !== undefined && isNaN(componentIdNum)) {
      throw new BadRequestException('Invalid componentId');
    }
    return this.recordsService.findAll(vehicleName, componentIdNum);
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
