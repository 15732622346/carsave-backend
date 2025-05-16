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
    this.logger.log(`[Service Create] Attempting to create maintenance record with DTO: ${JSON.stringify(dto)}`);
    // Add validation here: e.g., check if vehicle_id and component_id exist
    
    // 确保 vehicle_id 和 component_id 存在于 DTO 中
    if (!dto.vehicle_id) {
      this.logger.error('[Service Create] Validation Error: vehicle_id is missing');
      throw new Error('vehicle_id is required to create a maintenance record.'); // 或者抛出 BadRequestException
    }
    if (!dto.component_id) {
      this.logger.error('[Service Create] Validation Error: component_id is missing');
      throw new Error('component_id is required to create a maintenance record.'); // 或者抛出 BadRequestException
    }

    const recordEntity = this.recordsRepository.create({
      ...dto,
    });
    this.logger.log(`[Service Create] Entity created from DTO: ${JSON.stringify(recordEntity)}`);

    try {
      this.logger.log('[Service Create] Attempting to save entity to database...');
      const savedRecord = await this.recordsRepository.save(recordEntity);
      this.logger.log(`[Service Create] Entity saved successfully: ${JSON.stringify(savedRecord)}`);
      return savedRecord;
    } catch (error) {
      this.logger.error(`[Service Create] Error saving maintenance record: ${error.message}`, error.stack);
      throw error; // Re-throw the error to be caught by NestJS error handling
    }
  }

  async findAll(userId: number, vehicleId?: number, componentId?: number): Promise<MaintenanceRecord[]> {
    this.logger.log(`[Service findAll] Finding records for userId: ${userId}. Query Params: vehicleId=${vehicleId}, componentId=${componentId}`);
    
    const queryBuilder = this.recordsRepository.createQueryBuilder('record')
      .innerJoinAndSelect('record.vehicle', 'vehicle')
      .leftJoinAndSelect('record.maintenanceComponent', 'component')
      .where('vehicle.user_id = :userId', { userId })
      .orderBy('record.maintenance_date', 'DESC')
      .addOrderBy('record.id', 'DESC');

    if (vehicleId !== undefined && vehicleId !== null) {
      this.logger.log(`[Service findAll] Adding filter for vehicleId: ${vehicleId}`);
      queryBuilder.andWhere('record.vehicle_id = :vehicleId', { vehicleId });
    }

    if (componentId !== undefined && componentId !== null) {
      this.logger.log(`[Service findAll] Adding filter for componentId: ${componentId}`);
      queryBuilder.andWhere('record.component_id = :componentId', { componentId });
    }

    try {
      this.logger.log(`[Service findAll] Executing query for userId: ${userId}`);
      const records = await queryBuilder.getMany();
      this.logger.log(`[Service findAll] Found ${records.length} records for userId: ${userId}.`);
      return records;
    } catch (error) {
      this.logger.error(`[Service findAll] Error finding maintenance records for userId: ${userId} - ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number, userId: number): Promise<MaintenanceRecord> {
    this.logger.log(`[Service findOne] Finding maintenance record with id: ${id} for userId: ${userId}`);
    try {
      const record = await this.recordsRepository.createQueryBuilder('record')
        .innerJoinAndSelect('record.vehicle', 'vehicle')
        .leftJoinAndSelect('record.maintenanceComponent', 'component')
        .where('record.id = :id', { id })
        .andWhere('vehicle.user_id = :userId', { userId })
        .getOne();
      
      if (!record) {
        this.logger.warn(`[Service findOne] MaintenanceRecord with ID "${id}" not found or not accessible for userId: ${userId}.`);
        throw new NotFoundException(`MaintenanceRecord with ID "${id}" not found or not accessible by this user.`);
      }
      this.logger.log(`[Service findOne] Found record for userId ${userId}: ${JSON.stringify(record)}`);
      return record;
    } catch (error) {
      this.logger.error(`[Service findOne] Error finding record ${id} for userId ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: number, dto: UpdateMaintenanceRecordDto): Promise<MaintenanceRecord> {
    this.logger.log(`[Service update] Attempting to update maintenance record ${id} with DTO: ${JSON.stringify(dto)}`);
    
    // `preload` is a good way to load the entity and apply DTO changes, then save.
    // It returns undefined if the entity with the given id is not found.
    const recordToUpdate = await this.recordsRepository.preload({
      id: id,
      ...dto,
      // Ensure date is handled correctly if it's part of DTO and needs conversion
      ...(dto.maintenance_date && { maintenance_date: new Date(dto.maintenance_date) }),
    });

    if (!recordToUpdate) {
      this.logger.warn(`[Service update] MaintenanceRecord with ID "${id}" not found for update.`);
      throw new NotFoundException(`MaintenanceRecord with ID "${id}" not found.`);
    }

    this.logger.log(`[Service update] Record to update (after preload): ${JSON.stringify(recordToUpdate)}`);

    try {
      const updatedRecord = await this.recordsRepository.save(recordToUpdate);
      this.logger.log(`[Service update] Record ${id} updated successfully: ${JSON.stringify(updatedRecord)}`);
      return updatedRecord;
    } catch (error) {
      this.logger.error(`[Service update] Error updating record ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: number): Promise<{ deleted: boolean; message?: string }> {
    this.logger.log(`[Service remove] Attempting to remove maintenance record with id: ${id}`);
    const result = await this.recordsRepository.delete(id);
    if (result.affected === 0) {
      this.logger.warn(`[Service remove] MaintenanceRecord with ID "${id}" not found for deletion.`);
      throw new NotFoundException(`MaintenanceRecord with ID "${id}" not found.`);
    }
    this.logger.log(`[Service remove] Record ${id} deleted successfully. Result: ${JSON.stringify(result)}`);
    return { deleted: true };
  }
} 