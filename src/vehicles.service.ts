import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './database/entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { User } from './users/user.entity';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
  ) {}

  async create(createVehicleDto: CreateVehicleDto, user: User): Promise<Vehicle> {
    this.logger.log(`[VehiclesService] User ${user.id} creating vehicle: ${createVehicleDto.name}`);
    
    const existingVehicle = await this.vehiclesRepository.findOne({ 
        where: { 
          name: createVehicleDto.name,
          user_id: user.id
        } 
    });

    if (existingVehicle) {
      throw new ConflictException(`Vehicle with name "${createVehicleDto.name}" already exists for this user`);
    }

    const newVehicle = this.vehiclesRepository.create({
      ...createVehicleDto,
      user_id: user.id,
    });
    return this.vehiclesRepository.save(newVehicle);
  }

  async findAll(userId: number): Promise<Vehicle[]> {
    return this.vehiclesRepository.find({ where: { user_id: userId } });
  }

  async findOne(id: number, userId: number): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOne({ where: { id, user_id: userId } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID "${id}" not found or does not belong to this user`);
    }
    return vehicle;
  }

  async update(
    id: number,
    updateVehicleDto: UpdateVehicleDto,
    userId: number,
  ): Promise<Vehicle> {
    const existingVehicle = await this.vehiclesRepository.findOne({ where: { id, user_id: userId } });
    if (!existingVehicle) {
      throw new NotFoundException(`Vehicle with ID "${id}" not found or does not belong to this user`);
    }

    const vehicleToUpdate = await this.vehiclesRepository.preload({
      id: id,
      ...updateVehicleDto,
    });

    if (!vehicleToUpdate) {
      throw new NotFoundException(`Vehicle with ID "${id}" not found during preload.`);
    }
    
    if (vehicleToUpdate.user_id !== userId) {
        this.logger.warn(`Preloaded vehicle ${id} user_id ${vehicleToUpdate.user_id} does not match requesting user ${userId}. This should not happen.`);
        throw new NotFoundException(`Vehicle with ID "${id}" access denied.`);
    }

    return this.vehiclesRepository.save(vehicleToUpdate);
  }

  async remove(id: number, userId: number): Promise<void> {
    const vehicleToRemove = await this.vehiclesRepository.findOne({ where: { id, user_id: userId }});
    if (!vehicleToRemove) {
      throw new NotFoundException(`Vehicle with ID "${id}" not found or does not belong to this user`);
    }
    
    const result = await this.vehiclesRepository.delete({ id: id, user_id: userId }); 
    if (result.affected === 0) {
      throw new NotFoundException(`Vehicle with ID "${id}" could not be removed for this user, or was already removed.`);
    }
  }
}
