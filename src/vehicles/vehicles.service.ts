import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../database/entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { User } from '../database/entities/user.entity'; // Import User entity

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
  ) {}

  async create(createVehicleDto: CreateVehicleDto, userId: number): Promise<Vehicle> {
    this.logger.log(`Attempting to create vehicle for user ${userId} with DTO: ${JSON.stringify(createVehicleDto)}`);
    
    const newVehicle = this.vehiclesRepository.create(createVehicleDto);
    
    // Associate the vehicle with the user
    // We create a partial User object with just the id to establish the relationship.
    // TypeORM will correctly link this to the User with the given id.
    newVehicle.user = { id: userId } as User;

    this.logger.log(`Entity created from DTO (before save, with user association): ${JSON.stringify(newVehicle)}`);

    try {
      const savedVehicle = await this.vehiclesRepository.save(newVehicle);
      this.logger.log(`Vehicle saved successfully: ${JSON.stringify(savedVehicle)}`);
      return savedVehicle;
    } catch (error) {
      this.logger.error(`Error saving vehicle to database: ${error.message}`, error.stack);
      throw error; 
    }
  }

  async findAll(userId: number): Promise<Vehicle[]> {
    this.logger.log(`Finding all vehicles for user ${userId}`);
    try {
      const vehicles = await this.vehiclesRepository.find({
        where: { user: { id: userId } },
        relations: ['user'],
      });
      this.logger.log(`Found ${vehicles.length} vehicles for user ${userId}`);
      return vehicles;
    } catch (error) {
      this.logger.error(`Error finding vehicles for user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number): Promise<Vehicle> {
    this.logger.log(`Finding vehicle with id: ${id}`);
    const vehicle = await this.vehiclesRepository.findOne({ where: { id } });
    if (!vehicle) {
      this.logger.warn(`Vehicle with ID "${id}" not found`);
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }
    this.logger.log(`Found vehicle: ${JSON.stringify(vehicle)}`);
    return vehicle;
  }

  async update(id: number, updateVehicleDto: UpdateVehicleDto): Promise<Vehicle> {
    this.logger.log(`Attempting to update vehicle with ID "${id}". Data: ${JSON.stringify(updateVehicleDto)}`);
    const vehicleToUpdate = await this.vehiclesRepository.preload({
      id: id,
      ...updateVehicleDto,
      manufacturing_date: updateVehicleDto.manufacturing_date
                          ? new Date(updateVehicleDto.manufacturing_date)
                          : undefined,
    });

    if (!vehicleToUpdate) {
      this.logger.warn(`Vehicle with ID "${id}" not found for update.`);
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }

    this.logger.log(`Vehicle data to save (after preload and merge): ${JSON.stringify(vehicleToUpdate)}`);
    try {
      const updatedVehicle = await this.vehiclesRepository.save(vehicleToUpdate);
      this.logger.log(`Vehicle with ID "${id}" updated successfully: ${JSON.stringify(updatedVehicle)}`);
      return updatedVehicle;
    } catch (error) {
      this.logger.error(`Error updating vehicle with ID "${id}": ${error.message}`, error.stack);
      if (error.code === 'ER_DUP_ENTRY' || error.constructor.name === 'QueryFailedError' && error.message.includes('UNIQUE constraint failed')) {
          throw new ConflictException(`Failed to update vehicle. A vehicle with similar properties (e.g., name) might already exist.`);
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    this.logger.log(`Attempting to remove vehicle with ID "${id}"`);
    const result = await this.vehiclesRepository.delete(id);

    if (result.affected === 0) {
      this.logger.warn(`Vehicle with ID "${id}" not found for deletion, no records affected.`);
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }
    this.logger.log(`Vehicle with ID "${id}" removed successfully. Records affected: ${result.affected}`);
  }
} 