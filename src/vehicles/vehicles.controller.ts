import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('vehicles')
@UseGuards(AuthGuard('jwt'))
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(
    @Body() createVehicleDto: CreateVehicleDto,
    @Request() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    return this.vehiclesService.create(createVehicleDto, userId);
  }

  @Get()
  findAll(@Request() req: { user: { id: number } }) {
    const userId = req.user.id;
    return this.vehiclesService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: { id: number } }) {
    const userId = req.user.id;
    return this.vehiclesService.findOne(+id, userId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @Request() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    return this.vehiclesService.update(+id, updateVehicleDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: { id: number } }) {
    const userId = req.user.id;
    return this.vehiclesService.remove(+id, userId);
  }
}
