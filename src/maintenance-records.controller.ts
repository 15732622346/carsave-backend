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
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MaintenanceRecordsService } from './maintenance-records.service';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';
import { User } from 'src/users/user.entity';

@Controller('maintenance_records')
@UseGuards(AuthGuard('jwt'))
export class MaintenanceRecordsController {
  constructor(private readonly recordsService: MaintenanceRecordsService) {}

  @Post()
  create(@Body() createDto: CreateMaintenanceRecordDto, @Request() req: { user: User }) {
    return this.recordsService.create(createDto, req.user.id);
  }

  @Get()
  findAll(
    @Request() req: { user: User },
    @Query('vehicleId', new ParseIntPipe({ optional: true })) vehicleId?: number,
    @Query('componentId', new ParseIntPipe({ optional: true })) componentId?: number,
  ) {
    return this.recordsService.findAll(req.user.id, vehicleId, componentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: { user: User }) {
    return this.recordsService.findOne(id, req.user.id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMaintenanceRecordDto,
    @Request() req: { user: User },
  ) {
    return this.recordsService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: { user: User }) {
    return this.recordsService.remove(id, req.user.id);
  }
}
