import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto'; // DTO for request body validation
import { UpdateVehicleDto } from './dto/update-vehicle.dto'; // DTO for request body validation
import { AuthGuard } from '@nestjs/passport'; // Import AuthGuard
import { User } from 'src/users/user.entity'; // Changed to absolute path

@UseGuards(AuthGuard('jwt')) // Apply guard at class level
@Controller('vehicles') // Base path for all routes in this controller
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post() // Handles POST /vehicles
  create(@Body() createVehicleDto: CreateVehicleDto, @Request() req: { user: User }) {
    console.log('[VehiclesController] Received raw body:', createVehicleDto);
    // Add validation pipe later
    return this.vehiclesService.create(createVehicleDto, req.user);
  }

  @Get() // Handles GET /vehicles
  findAll(@Request() req: { user: User }) {
    return this.vehiclesService.findAll(req.user.id);
  }

  @Get(':id') // Handles GET /vehicles/:id
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: { user: User }) {
    // ParseIntPipe ensures id is a number
    return this.vehiclesService.findOne(id, req.user.id);
  }

  @Put(':id') // Handles PUT /vehicles/:id
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @Request() req: { user: User },
  ) {
    // Add validation pipe later
    return this.vehiclesService.update(id, updateVehicleDto, req.user.id);
  }

  @Delete(':id') // Handles DELETE /vehicles/:id
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: { user: User }) {
    return this.vehiclesService.remove(id, req.user.id);
  }
}
