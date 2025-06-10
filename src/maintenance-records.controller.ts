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
  Req,
} from '@nestjs/common';
import { MaintenanceRecordsService } from './maintenance-records/maintenance-records.service';
import { CreateMaintenanceRecordDto } from './maintenance-records/dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './maintenance-records/dto/update-maintenance-record.dto';

@Controller('maintenance_records')
export class MaintenanceRecordsController {
  constructor(private readonly recordsService: MaintenanceRecordsService) {}

  @Post()
  create(
    @Body() createDto: CreateMaintenanceRecordDto,
    @Req() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    return this.recordsService.create(createDto, userId);
  }

  @Get()
  findAll(
    @Req() req: { user: { id: number } },
    @Query('vehicleId', new ParseIntPipe({ optional: true }))
    vehicleId?: number,
    @Query('componentId', new ParseIntPipe({ optional: true }))
    componentId?: number,
  ) {
    const userId = req.user.id;
    return this.recordsService.findAll(userId, vehicleId, componentId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    return this.recordsService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMaintenanceRecordDto,
    @Req() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    return this.recordsService.update(id, updateDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    return this.recordsService.remove(id, userId);
  }
}
