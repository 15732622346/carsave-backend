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
    this.logger.log(`Creating vehicle: ${JSON.stringify(createVehicleDto)}`);
    // CreateVehicleDto 不应该包含 id，所以直接使用它来创建实体
    const newVehicleEntity = this.vehiclesRepository.create(createVehicleDto);
    
    const currentDate = new Date();
    // 模拟数据库保存行为: 后端生成 ID，并添加时间戳和空的关联数组
    const savedVehicle = {
      ...newVehicleEntity, // newVehicleEntity 基于 DTO，不含 id, created_at, updated_at
      id: Date.now(),      // 模拟后端生成新的 ID
      created_at: currentDate,
      updated_at: currentDate,
      maintenanceComponents: [],
      maintenanceRecords: [],
    } as Vehicle;
    return Promise.resolve(savedVehicle);
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