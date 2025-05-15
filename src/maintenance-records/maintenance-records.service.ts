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

  async findAll(vehicleId?: number, componentId?: number, vehicleName?: string): Promise<MaintenanceRecord[]> {
    this.logger.log(`[Service findAll] Finding all records. Query Params: vehicleId=${vehicleId}, componentId=${componentId}, vehicleName=${vehicleName}`);
    
    const findOptions: import('typeorm').FindManyOptions<MaintenanceRecord> = {
      where: {},
      relations: ['vehicle', 'maintenanceComponent'], // 根据实体定义加载关联数据
      order: { maintenance_date: 'DESC', id: 'DESC' } // 按保养日期降序，然后按ID降序
    };

    if (vehicleId !== undefined && vehicleId !== null) {
      // @ts-ignore
      findOptions.where.vehicle_id = vehicleId; // TypeORM 5+ 接受直接赋值
    }
    // 注意：前端 MaintenanceView.vue 的 fetchMaintenanceData 传递的是 vehicleIdToFilter，
    // 它会作为 vehicleIdentifier 传递给 store 的 fetchRecords，然后 store 的 fetchRecords 使用 params.vehicleId.
    // 所以这里的 vehicleId 参数应该是有效的。

    // componentId 过滤 (如果需要)
    if (componentId !== undefined && componentId !== null) {
      // @ts-ignore
      findOptions.where.component_id = componentId;
    }

    // vehicleName 过滤 (如果需要，这通常更复杂，可能需要连接查询或在获取后过滤)
    // 目前，如果提供了 vehicleName，我们将忽略 vehicleId 进行查询，这可能不是最佳策略。
    // 一个更好的方法是如果 vehicleName 存在，先通过 vehicleName 找到 vehicleId，然后再用 vehicleId 过滤。
    // 但当前 DTO 和前端逻辑似乎更侧重于 vehicleId。
    // 为了简单起见，如果 vehicleName 存在，我们将尝试通过它进行查询（假设 vehicle 关系已加载）。
    // 这部分逻辑可以后续优化，目前主要解决 mock 问题。

    try {
      this.logger.log(`[Service findAll] Executing find with options: ${JSON.stringify(findOptions)}`);
      const records = await this.recordsRepository.find(findOptions);
      this.logger.log(`[Service findAll] Found ${records.length} records.`);
      
      // 如果需要根据 vehicleName 进一步过滤 (当 vehicleId 未提供时)
      if (vehicleName && (vehicleId === undefined || vehicleId === null) && records.length > 0) {
        this.logger.log(`[Service findAll] Filtering by vehicleName: "${vehicleName}"`);
        return records.filter(record => record.vehicle && record.vehicle.name === vehicleName);
      }
      return records;
    } catch (error) {
      this.logger.error(`[Service findAll] Error finding maintenance records: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number): Promise<MaintenanceRecord> {
    this.logger.log(`[Service findOne] Finding maintenance record with id: ${id}`);
    const record = await this.recordsRepository.findOne({
      where: { id },
      relations: ['vehicle', 'maintenanceComponent'],
    });
    if (!record) {
      this.logger.warn(`[Service findOne] MaintenanceRecord with ID "${id}" not found.`);
      throw new NotFoundException(`MaintenanceRecord with ID "${id}" not found.`);
    }
    this.logger.log(`[Service findOne] Found record: ${JSON.stringify(record)}`);
    return record;
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