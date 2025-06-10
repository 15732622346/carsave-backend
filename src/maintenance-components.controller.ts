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
import { MaintenanceComponentsService } from './maintenance-components/maintenance-components.service';
import { CreateMaintenanceComponentDto } from './maintenance-components/dto/create-maintenance-component.dto';
import { UpdateMaintenanceComponentDto } from './maintenance-components/dto/update-maintenance-component.dto';
// import { IsNumber, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator'; // Commented out as MaintainComponentDto is commented

// Define a DTO for the /maintain endpoint body
// class MaintainComponentDto { // Commented out as markAsMaintained is commented
//   @IsNumber()
//   @IsNotEmpty()
//   currentMileage: number;
//
//   @IsBoolean()
//   @IsOptional()
//   recalculateNextTarget?: boolean = true; // Default to true if not provided
// }

@Controller('maintenance_components')
export class MaintenanceComponentsController {
  constructor(
    private readonly componentsService: MaintenanceComponentsService,
  ) {}

  @Post()
  create(
    @Body() createDto: CreateMaintenanceComponentDto,
    @Req() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    return this.componentsService.create(createDto, userId);
  }

  @Get()
  findAll(
    @Req() req: { user: { id: number } },
    @Query('vehicleId', new ParseIntPipe({ optional: true }))
    vehicleId?: number,
  ) {
    const userId = req.user.id;
    return this.componentsService.findAll(userId, vehicleId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    return this.componentsService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMaintenanceComponentDto,
    @Req() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    return this.componentsService.update(id, updateDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number } },
  ) {
    const userId = req.user.id;
    return this.componentsService.remove(id, userId);
  }

  // @Patch(':id/maintain') // Add PATCH route for marking as maintained
  // markAsMaintained(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() maintainDto: MaintainComponentDto, // Use the new DTO
  //   @Req() req: { user: { id: number } },
  // ) {
  //   const userId = req.user.id; // Assuming service needs userId
  //   // return this.componentsService.markAsMaintained(
  //   //   id,
  //   //   maintainDto.currentMileage,
  //   //   maintainDto.recalculateNextTarget,
  //   //   userId, // Pass userId if service requires it
  //   // );
  //   // TODO: Implement markAsMaintained in service if this is to be kept
  //   return 'markAsMaintained endpoint called, but service method is missing or needs userId';
  // }
}
