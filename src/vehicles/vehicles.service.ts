import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../database/entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
// import { User } from '../database/entities/user.entity'; // 假设车辆与用户关联

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    this.logger.log(`Attempting to create vehicle with DTO: ${JSON.stringify(createVehicleDto)}`);
    
    // Create a new entity instance from the DTO.
    // TypeORM's `create` method handles mapping DTO fields to entity properties.
    // If DTO has fields like `manufacturing_date` (string) and entity has `manufacturingDate` (Date),
    // TypeORM might handle this conversion if the types are compatible or if decorators specify transformers.
    // For now, we assume direct compatibility or that TypeORM handles basic string-to-Date if applicable.
    const newVehicle = this.vehiclesRepository.create(createVehicleDto);
    
    this.logger.log(`Entity created from DTO (before save): ${JSON.stringify(newVehicle)}`);

    try {
      // Save the new entity to the database.
      // The `save` method will perform an INSERT operation.
      const savedVehicle = await this.vehiclesRepository.save(newVehicle);
      this.logger.log(`Vehicle saved successfully: ${JSON.stringify(savedVehicle)}`);
      return savedVehicle;
    } catch (error) {
      this.logger.error(`Error saving vehicle to database: ${error.message}`, error.stack);
      // Rethrow the error or handle it as a specific HTTP exception
      // For example, if it's a unique constraint violation, you might throw a ConflictException.
      throw error; 
    }
  }

  async findAll(): Promise<Vehicle[]> {
    this.logger.log('Finding all vehicles');
    return Promise.resolve([]);
  }

  async findOne(id: number): Promise<Vehicle> {
    this.logger.log(`Finding vehicle with id: ${id}`);
    const currentDate = new Date();
    const mockDtoData: CreateVehicleDto = {
      name: 'Mock Vehicle',
      mileage: 10000,
      manufacturing_date: new Date('2020-01-01').toISOString().split('T')[0],
      plate_number: 'TEST1234',
      image: 'mock_image_url.png',
    };
    
    const vehicleEntity = this.vehiclesRepository.create(mockDtoData);

    return Promise.resolve({
        ...vehicleEntity, 
        id, 
        manufacturing_date: new Date(mockDtoData.manufacturing_date!), 
        created_at: currentDate,
        updated_at: currentDate,
        maintenanceComponents: [],
        maintenanceRecords: [],
    } as Vehicle);
  }

  async update(id: number, updateVehicleDto: UpdateVehicleDto): Promise<Vehicle> {
    this.logger.log(`Updating vehicle with id: ${id} with data: ${JSON.stringify(updateVehicleDto)}`);
    const existingMock = await this.findOne(id);
    
    const updatedEntityData = {
        ...existingMock, 
        ...updateVehicleDto, 
        manufacturing_date: updateVehicleDto.manufacturing_date 
                              ? new Date(updateVehicleDto.manufacturing_date) 
                              : existingMock.manufacturing_date, 
    };

    const updatedVehicle = {
      ...this.vehiclesRepository.create(updatedEntityData as Partial<Vehicle>), 
      id, 
      updated_at: new Date(), 
      created_at: existingMock.created_at, 
      maintenanceComponents: existingMock.maintenanceComponents,
      maintenanceRecords: existingMock.maintenanceRecords,
    } as Vehicle;
    return Promise.resolve(updatedVehicle);
  }

  async remove(id: number): Promise<{ deleted: boolean; message?: string }> {
    this.logger.log(`Removing vehicle with id: ${id}`);
    return Promise.resolve({ deleted: true });
  }
} 