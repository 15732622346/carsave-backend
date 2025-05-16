import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { VehiclesService } from './vehicles/vehicles.service';
import { CreateVehicleDto } from './vehicles/dto/create-vehicle.dto'; // DTO for request body validation
import { UpdateVehicleDto } from './vehicles/dto/update-vehicle.dto'; // DTO for request body validation

@Controller('vehicles') // Base path for all routes in this controller
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post() // Handles POST /vehicles
  create(
    @Body() createVehicleDto: CreateVehicleDto,
    @Req() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    console.log('[VehiclesController] Received raw body:', createVehicleDto);
    // Add validation pipe later
    return this.vehiclesService.create(createVehicleDto, userId);
  }

  @Get() // Handles GET /vehicles
  findAll(@Req() req: { user: { id: number } }) {
    const userId = req.user.id;
    return this.vehiclesService.findAll(userId);
  }

  @Get(':id') // Handles GET /vehicles/:id
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    // ParseIntPipe ensures id is a number
    return this.vehiclesService.findOne(id, userId);
  }

  @Put(':id') // Handles PUT /vehicles/:id
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @Req() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    // Add validation pipe later
    return this.vehiclesService.update(id, updateVehicleDto, userId);
  }

  @Delete(':id') // Handles DELETE /vehicles/:id
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    return this.vehiclesService.remove(id, userId);
  }
}
