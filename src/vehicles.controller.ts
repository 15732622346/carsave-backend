import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto'; // DTO for request body validation
import { UpdateVehicleDto } from './dto/update-vehicle.dto'; // DTO for request body validation

@Controller('vehicles') // Base path for all routes in this controller
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post() // Handles POST /vehicles
  create(@Body() createVehicleDto: CreateVehicleDto) {
    console.log('[VehiclesController] Received raw body:', createVehicleDto);
    // Add validation pipe later
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get() // Handles GET /vehicles
  findAll() {
    return this.vehiclesService.findAll();
  }

  @Get(':id') // Handles GET /vehicles/:id
  findOne(@Param('id', ParseIntPipe) id: number) {
    // ParseIntPipe ensures id is a number
    return this.vehiclesService.findOne(id);
  }

  @Put(':id') // Handles PUT /vehicles/:id
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    // Add validation pipe later
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @Delete(':id') // Handles DELETE /vehicles/:id
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.remove(id);
  }
}
