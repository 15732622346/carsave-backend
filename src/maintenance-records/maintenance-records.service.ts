// src/maintenance-records/maintenance-records.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceRecord } from '../database/entities/maintenance-record.entity';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';
import { Vehicle } from '../database/entities/vehicle.entity';
import { MaintenanceComponent } from '../database/entities/maintenance-component.entity';

@Injectable()
export class MaintenanceRecordsService {
  private readonly logger = new Logger(MaintenanceRecordsService.name);

  constructor(
    @InjectRepository(MaintenanceRecord)
    private recordsRepository: Repository<MaintenanceRecord>,
    // @InjectRepository(Vehicle) // If needed for validation
    // private vehicleRepository: Repository<Vehicle>,
    // @InjectRepository(MaintenanceComponent) // If needed for validation
    // private componentRepository: Repository<MaintenanceComponent>,
  ) {}

  async create(dto: CreateMaintenanceRecordDto): Promise<MaintenanceRecord> {
    this.logger.log(`Attempting to create maintenance record: ${JSON.stringify(dto)}`);
    // Add validation here: e.g., check if vehicle_id and component_id exist
    // const record = this.recordsRepository.create(dto);
    // return this.recordsRepository.save(record);
    
    // Mock
    const mockRecord = {
        id: Date.now(),
        ...dto,
        maintenance_date: new Date(dto.maintenance_date),
        created_at: new Date(),
        updated_at: new Date(),
        vehicle: { id: dto.vehicle_id } as Vehicle, 
        component: { id: dto.component_id } as MaintenanceComponent,
    } as unknown as MaintenanceRecord;
    return Promise.resolve(mockRecord);
  }

  async findAll(vehicleId?: number, componentId?: number, vehicleName?: string): Promise<MaintenanceRecord[]> {
    this.logger.log(`Finding all records. VehicleId: ${vehicleId}, ComponentId: ${componentId}, VehicleName: ${vehicleName}`);
    // Add actual filtering logic based on params
    return Promise.resolve([]); // Mock
  }

  async findOne(id: number): Promise<MaintenanceRecord> {
    this.logger.log(`Finding maintenance record with id: ${id}`);
    // const record = await this.recordsRepository.findOne({ where: { id } });
    // if (!record) {
    //   throw new NotFoundException(`MaintenanceRecord with ID "${id}" not found.`);
    // }
    // return record;
    
    // Mock
     const mockDto: CreateMaintenanceRecordDto = {
        vehicle_id: 1,
        component_id: 1,
        maintenance_date: new Date().toISOString().split('T')[0],
        mileage_at_maintenance: 12000,
        notes: "Mock record"
    };
    const mockRecord = {
        id,
        ...mockDto,
        maintenance_date: new Date(mockDto.maintenance_date),
        created_at: new Date(),
        updated_at: new Date(),
        vehicle: { id: mockDto.vehicle_id } as Vehicle, 
        component: { id: mockDto.component_id } as MaintenanceComponent,
    } as unknown as MaintenanceRecord;
    return Promise.resolve(mockRecord);
  }

  async update(id: number, dto: UpdateMaintenanceRecordDto): Promise<MaintenanceRecord> {
    this.logger.log(`Updating maintenance record ${id} with: ${JSON.stringify(dto)}`);
    // const record = await this.findOne(id); // Ensure record exists
    // const updatedRecord = this.recordsRepository.merge(record, dto);
    // return this.recordsRepository.save(updatedRecord);
    
    // Mock
    const existing = await this.findOne(id);
    const updated = { 
        ...existing, 
        ...dto, 
        id, 
        maintenance_date: dto.maintenance_date ? new Date(dto.maintenance_date) : existing.maintenance_date,
        updated_at: new Date() 
    } as MaintenanceRecord;
    return Promise.resolve(updated);
  }

  async remove(id: number): Promise<{ deleted: boolean; message?: string }> {
    this.logger.log(`Removing maintenance record with id: ${id}`);
    // const result = await this.recordsRepository.delete(id);
    // if (result.affected === 0) {
    //   throw new NotFoundException(`MaintenanceRecord with ID "${id}" not found.`);
    // }
    // return { deleted: true };
    return Promise.resolve({ deleted: true }); // Mock
  }
} 