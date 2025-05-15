// src/maintenance-components/maintenance-components.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceComponent } from '../database/entities/maintenance-component.entity';
import { CreateMaintenanceComponentDto, MaintenanceType } from './dto/create-maintenance-component.dto';
import { UpdateMaintenanceComponentDto } from './dto/update-maintenance-component.dto';
import { Vehicle } from '../database/entities/vehicle.entity'; // For relation

@Injectable()
export class MaintenanceComponentsService {
  private readonly logger = new Logger(MaintenanceComponentsService.name);

  constructor(
    @InjectRepository(MaintenanceComponent)
    private componentsRepository: Repository<MaintenanceComponent>,
    @InjectRepository(Vehicle) // To check if vehicle exists before associating
    private vehicleRepository: Repository<Vehicle>,
  ) {}

  async create(dto: CreateMaintenanceComponentDto): Promise<MaintenanceComponent> {
    this.logger.log(`Attempting to create maintenance component: ${JSON.stringify(dto)}`);
    // const vehicle = await this.vehicleRepository.findOne({ where: { id: dto.vehicle_id } });
    // if (!vehicle) {
    //   throw new NotFoundException(`Vehicle with ID "${dto.vehicle_id}" not found.`);
    // }
    // const component = this.componentsRepository.create({ ...dto, vehicle });
    // return this.componentsRepository.save(component);
    
    // Mock implementation
    const mockComponent = {
        id: Date.now(),
        ...dto,
        created_at: new Date(),
        updated_at: new Date(),
        vehicle: { id: dto.vehicle_id } as Vehicle, // simplified mock relation
        maintenanceRecords: []
    } as unknown as MaintenanceComponent;
    this.logger.log(`Mock created component: ${JSON.stringify(mockComponent)}`);
    return Promise.resolve(mockComponent);
  }

  async findAll(vehicleId?: number, vehicleName?: string): Promise<MaintenanceComponent[]> {
    this.logger.log(`Finding all maintenance components. VehicleId: ${vehicleId}, VehicleName: ${vehicleName}`);
    // Actual implementation would filter based on these parameters
    // For mock, we just log and return empty or sample data
    if (vehicleId) {
      this.logger.log(`Filtering by vehicleId: ${vehicleId}`);
    }
    if (vehicleName) {
      this.logger.log(`Filtering by vehicleName: ${vehicleName}`);
    }
    return Promise.resolve([]); // Mock
  }

  async findOne(id: number): Promise<MaintenanceComponent> {
    this.logger.log(`Finding maintenance component with id: ${id}`);
    // const component = await this.componentsRepository.findOne({ where: { id }, relations: ['vehicle'] });
    // if (!component) {
    //   throw new NotFoundException(`MaintenanceComponent with ID "${id}" not found.`);
    // }
    // return component;
    // Mock
    const mockDto: CreateMaintenanceComponentDto = {
        name: "Mock Component",
        vehicle_id: 1,
        maintenance_type: MaintenanceType.MILEAGE,
        maintenance_value: 10000,
        unit: "km"
    };
    const mockComponent = {
        id,
        ...mockDto,
        created_at: new Date(),
        updated_at: new Date(),
        vehicle: { id: mockDto.vehicle_id } as Vehicle,
        maintenanceRecords: []
    } as unknown as MaintenanceComponent;
    return Promise.resolve(mockComponent); 
  }

  async update(id: number, dto: UpdateMaintenanceComponentDto): Promise<MaintenanceComponent> {
    this.logger.log(`Updating maintenance component ${id} with data: ${JSON.stringify(dto)}`);
    // const component = await this.findOne(id); // Ensures component exists
    // if (dto.vehicle_id && component.vehicle.id !== dto.vehicle_id) {
    //   const vehicle = await this.vehicleRepository.findOne({ where: { id: dto.vehicle_id } });
    //   if (!vehicle) throw new NotFoundException(`Vehicle with ID "${dto.vehicle_id}" not found.`);
    //   component.vehicle = vehicle;
    // }
    // const updatedComponent = this.componentsRepository.merge(component, dto as Partial<MaintenanceComponent>); // type assertion
    // return this.componentsRepository.save(updatedComponent);
    
    // Mock
    const existing = await this.findOne(id);
    const updated = { ...existing, ...dto, id, updated_at: new Date() } as MaintenanceComponent;
    return Promise.resolve(updated);
  }

  async remove(id: number): Promise<{ deleted: boolean; message?: string }> {
    this.logger.log(`Removing maintenance component with id: ${id}`);
    // const result = await this.componentsRepository.delete(id);
    // if (result.affected === 0) {
    //   throw new NotFoundException(`MaintenanceComponent with ID "${id}" not found.`);
    // }
    // return { deleted: true };
    return Promise.resolve({ deleted: true }); // Mock
  }
} 