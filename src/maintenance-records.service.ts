import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceRecord } from './database/entities/maintenance-record.entity';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';
import { MaintenanceComponent } from './database/entities/maintenance-component.entity';
import { Vehicle } from './database/entities/vehicle.entity';
import { addDays } from 'date-fns'; // Import date-fns for adding days

@Injectable()
export class MaintenanceRecordsService {
  private readonly logger = new Logger(MaintenanceRecordsService.name);

  constructor(
    @InjectRepository(MaintenanceRecord)
    private recordsRepository: Repository<MaintenanceRecord>,
    @InjectRepository(MaintenanceComponent)
    private componentsRepository: Repository<MaintenanceComponent>,
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
  ) {}

  async create(
    createRecordDto: CreateMaintenanceRecordDto,
    userId: number,
    skipComponentUpdate: boolean = false,
  ): Promise<MaintenanceRecord> {
    this.logger.log(`User ${userId} creating record for vehicle ${createRecordDto.vehicle_id}, component ${createRecordDto.component_id}`);

    const vehicle = await this.vehiclesRepository.findOne({
      where: { id: createRecordDto.vehicle_id, user_id: userId },
    });
    if (!vehicle) {
      throw new BadRequestException(
        `Vehicle with ID "${createRecordDto.vehicle_id}" not found or does not belong to user ${userId}`,
      );
    }

    const component = await this.componentsRepository.findOne({
      where: {
      id: createRecordDto.component_id,
        vehicle_id: createRecordDto.vehicle_id, 
        user_id: userId, 
      },
    });
    if (!component) {
      throw new BadRequestException(
        `Component with ID "${createRecordDto.component_id}" not found for vehicle ID "${createRecordDto.vehicle_id}" or does not belong to user ${userId}`,
      );
    }

    const newRecordData: Partial<MaintenanceRecord> = {
      ...createRecordDto,
      user_id: userId,
    };
    const newRecord = this.recordsRepository.create(newRecordData);
    const savedRecord = await this.recordsRepository.save(newRecord);

    if (!skipComponentUpdate) {
      this.logger.log(`Updating component ${component.id} after record creation ${savedRecord.id}`);
    try {
      component.last_maintenance_date = savedRecord.maintenance_date;
      if (component.maintenance_type === 'date') {
        component.target_maintenance_date = addDays(
          savedRecord.maintenance_date,
            component.maintenance_value,
        );
          component.target_maintenance_mileage = null;
      } else if (component.maintenance_type === 'mileage') {
        if (savedRecord.mileage_at_maintenance == null) {
            this.logger.warn(
            `Mileage not provided for mileage-based component record (Component ID: ${component.id}, Record ID: ${savedRecord.id}). Target mileage not updated.`,
          );
            component.target_maintenance_mileage = vehicle.mileage + component.maintenance_value; 
        } else {
          component.target_maintenance_mileage = 
            savedRecord.mileage_at_maintenance + component.maintenance_value;
        }
          component.target_maintenance_date = null;
      }
      await this.componentsRepository.save(component);
    } catch (error) {
        this.logger.error(
          `Error updating component (ID: ${component.id}) after creating record (ID: ${savedRecord.id}): ${error.message}`,
          error.stack,
        );
      }
    }
    return savedRecord;
  }

  async createForComponentMaintained(
    createRecordDto: CreateMaintenanceRecordDto,
    userId: number,
  ): Promise<MaintenanceRecord> {
    this.logger.log(`Creating record for component maintained by user ${userId}, DTO: ${JSON.stringify(createRecordDto)}`);
    return this.create(createRecordDto, userId, true); 
  }

  async findAll(userId: number, vehicleIdParam?: number, componentId?: number): Promise<MaintenanceRecord[]> {
    this.logger.log(`User ${userId} findAll records. VehicleId: ${vehicleIdParam}, ComponentId: ${componentId}`);
    const where: any = { user_id: userId };

    if (vehicleIdParam !== undefined) {
      const vehicle = await this.vehiclesRepository.findOne({ where: { id: vehicleIdParam, user_id: userId }});
      if (!vehicle) {
        this.logger.warn(`User ${userId} - Vehicle ${vehicleIdParam} not found or not owned.`);
        return [];
      }
      where.vehicle_id = vehicleIdParam;
    }

    if (componentId !== undefined) {
      const componentQuery: any = { id: componentId, user_id: userId };
      if (where.vehicle_id) { 
        componentQuery.vehicle_id = where.vehicle_id;
      }
      const component = await this.componentsRepository.findOne({ where: componentQuery });
      if (!component) {
        this.logger.warn(`User ${userId} - Component ${componentId} (for vehicle ${where.vehicle_id || 'any'}) not found or not owned.`);
        return []; 
      }
      where.component_id = componentId;
    }
    
    return this.recordsRepository.find({ 
      where, 
      order: { maintenance_date: 'DESC', created_at: 'DESC' },
    });
  }

  async findOne(id: number, userId: number): Promise<MaintenanceRecord> {
    this.logger.log(`User ${userId} findOne record ${id}`);
    const record = await this.recordsRepository.findOne({ where: { id, user_id: userId } });
    if (!record) {
      throw new NotFoundException(
        `Record with ID "${id}" not found or does not belong to user ${userId}`,
      );
    }
    return record;
  }

  async update(
    id: number,
    updateRecordDto: UpdateMaintenanceRecordDto,
    userId: number,
  ): Promise<MaintenanceRecord> {
    this.logger.log(`User ${userId} update record ${id} with DTO: ${JSON.stringify(updateRecordDto)}`);
    const existingRecord = await this.findOne(id, userId); 

    if (updateRecordDto.vehicle_id && updateRecordDto.vehicle_id !== existingRecord.vehicle_id) {
      const vehicle = await this.vehiclesRepository.findOne({
        where: { id: updateRecordDto.vehicle_id, user_id: userId },
      });
      if (!vehicle)
      throw new BadRequestException(
          `Update failed: Target Vehicle ID "${updateRecordDto.vehicle_id}" not found or does not belong to user ${userId}.`,
      );
    }
    
    const targetVehicleId = updateRecordDto.vehicle_id || existingRecord.vehicle_id;

    if (updateRecordDto.component_id && updateRecordDto.component_id !== existingRecord.component_id) {
      const component = await this.componentsRepository.findOne({
        where: { id: updateRecordDto.component_id, user_id: userId, vehicle_id: targetVehicleId },
      });
      if (!component)
      throw new BadRequestException(
          `Update failed: Target Component ID "${updateRecordDto.component_id}" not found for vehicle "${targetVehicleId}" or does not belong to user ${userId}.`,
      );
    }

    const recordToUpdate = await this.recordsRepository.preload({
      id: id,
      ...updateRecordDto,
      user_id: userId, 
    });
    
    if (!recordToUpdate) {
        throw new NotFoundException(`Record with ID "${id}" could not be preloaded.`);
    }

    if (recordToUpdate.user_id !== userId) {
        this.logger.error(`Integrity issue: Record ${id} user_id mismatch during update for user ${userId}.`);
        throw new BadRequestException('Record ownership mismatch.');
    }

    return this.recordsRepository.save(recordToUpdate);
  }

  async remove(id: number, userId: number): Promise<void> {
    this.logger.log(`User ${userId} remove record ${id}`);
    const record = await this.findOne(id, userId); 
    const result = await this.recordsRepository.delete(record.id); 
    if (result.affected === 0) {
      throw new NotFoundException(
        `Record with ID "${id}" could not be removed for user ${userId}, or was already removed.`,
      );
    }
  }
}
