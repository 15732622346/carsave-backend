import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './database/entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto'; // Path should be correct
import { UpdateVehicleDto } from './dto/update-vehicle.dto'; // Path should be correct

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) // Inject using the standard decorator
    private vehiclesRepository: Repository<Vehicle>,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    console.log('[VehiclesService] Received DTO:', createVehicleDto);
    // Check if a vehicle with the same name already exists
    const existingVehicle = await this.vehiclesRepository.findOne({ 
        where: { name: createVehicleDto.name } 
    });

    if (existingVehicle) {
      // If found, throw a 409 Conflict exception
      throw new ConflictException(`Vehicle with name "${createVehicleDto.name}" already exists`);
    }

    // If not found, proceed to create and save the new vehicle
    const newVehicle = this.vehiclesRepository.create(createVehicleDto);
    return this.vehiclesRepository.save(newVehicle);
  }

  async findAll(): Promise<Vehicle[]> {
    return this.vehiclesRepository.find();
  }

  async findOne(id: number): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }
    return vehicle;
  }

  async update(
    id: number,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    // Load the existing vehicle, then update its properties
    const vehicle = await this.vehiclesRepository.preload({
      id: id,
      ...updateVehicleDto,
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }
    return this.vehiclesRepository.save(vehicle);
  }

  async remove(id: number): Promise<void> {
    const result = await this.vehiclesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }
  }
}
