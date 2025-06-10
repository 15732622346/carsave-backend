// src/maintenance-records/maintenance-records.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
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
    private maintenanceRecordRepository: Repository<MaintenanceRecord>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(MaintenanceComponent)
    private maintenanceComponentRepository: Repository<MaintenanceComponent>,
  ) {}

  async create(
    createRecordDto: CreateMaintenanceRecordDto,
    userId: number,
  ): Promise<MaintenanceRecord> {
    // this.logger.log(`[CREATE START] UserID: ${userId}, DTO: ${JSON.stringify(createRecordDto)}`);
    const { vehicle_id, component_id, maintenance_date, ...restOfDto } =
      createRecordDto;

    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicle_id, user: { id: userId } },
    });
    if (!vehicle) {
      this.logger.warn(
        `[CREATE] Vehicle not found or not authorized. Vehicle ID: ${vehicle_id}, UserID: ${userId}`,
      );
      throw new NotFoundException(
        `Vehicle with ID ${vehicle_id} not found or not authorized for this user.`,
      );
    }

    let componentToAssign: MaintenanceComponent | null = null;
    if (component_id) {
      const component = await this.maintenanceComponentRepository.findOne({
        where: { id: component_id, vehicle: { id: vehicle_id } },
      });
      if (!component) {
        this.logger.warn(
          `[CREATE] Component not found for this vehicle. Component ID: ${component_id}, Vehicle ID: ${vehicle_id}`,
        );
        throw new NotFoundException(
          `Maintenance component with ID ${component_id} not found for vehicle ${vehicle_id}.`,
        );
      }
      componentToAssign = component;
    }

    const newRecord = new MaintenanceRecord();
    Object.assign(newRecord, restOfDto);
    newRecord.maintenance_date = new Date(maintenance_date);
    newRecord.vehicle_id = vehicle.id;
    newRecord.vehicle = vehicle;
    if (componentToAssign) {
      newRecord.component_id = componentToAssign.id;
      newRecord.maintenanceComponent = componentToAssign;
    } else {
      newRecord.component_id = null;
      newRecord.maintenanceComponent = null;
    }

    // this.logger.log(`[CREATE] Record entity constructed: ${JSON.stringify(newRecord)}`);
    try {
      const savedRecord: MaintenanceRecord =
        await this.maintenanceRecordRepository.save(newRecord);
      // this.logger.log(`[CREATE SUCCESS] Record saved, ID: ${savedRecord.id}`);
      return savedRecord;
    } catch (err: unknown) {
      let errorMessage = 'Error saving record';
      let errorStack: string | undefined;

      if (err instanceof Error) {
        errorMessage = err.message;
        errorStack = err.stack;
      } else {
        errorMessage = String(err);
      }
      this.logger.error(`[CREATE DB EXCEPTION] ${errorMessage}`, errorStack);
      // Consider checking for specific error codes if needed, e.g., foreign key constraints
      throw new InternalServerErrorException(
        'Could not create maintenance record.',
      );
    }
  }

  async findAll(
    userId: number,
    vehicleId?: number,
    componentId?: number,
  ): Promise<MaintenanceRecord[]> {
    // this.logger.log(`[FIND_ALL START] UserID: ${userId}, VehicleID: ${vehicleId}, ComponentID: ${componentId}`);
    const queryBuilder = this.maintenanceRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.vehicle', 'vehicle')
      .leftJoinAndSelect('record.maintenanceComponent', 'component') // Also select component details if needed
      .leftJoin('vehicle.user', 'user')
      .where('user.id = :userId', { userId });

    if (vehicleId) {
      queryBuilder.andWhere('vehicle.id = :vehicleId', { vehicleId });
    }

    if (componentId) {
      queryBuilder.andWhere('record.component_id = :componentId', {
        componentId,
      });
    }

    queryBuilder
      .orderBy('record.maintenance_date', 'DESC')
      .addOrderBy('record.created_at', 'DESC');

    try {
      const records = await queryBuilder.getMany();
      // this.logger.log(`[FIND_ALL SUCCESS] Found ${records.length} records.`);
      return records;
    } catch (err: unknown) {
      let errorMessage = 'Error finding records';
      let errorStack: string | undefined;

      if (err instanceof Error) {
        errorMessage = err.message;
        errorStack = err.stack;
      } else {
        errorMessage = String(err);
      }
      this.logger.error(`[FIND_ALL DB EXCEPTION] ${errorMessage}`, errorStack);
      throw new InternalServerErrorException(
        'Could not retrieve maintenance records.',
      );
    }
  }

  async findOne(id: number, userId: number): Promise<MaintenanceRecord> {
    // this.logger.log(`[FIND_ONE START] ID: ${id}, UserID: ${userId}`);
    const record = await this.maintenanceRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.vehicle', 'vehicle')
      .leftJoinAndSelect('record.maintenanceComponent', 'component') // Also select component details
      .leftJoin('vehicle.user', 'user')
      .where('record.id = :id', { id })
      .andWhere('user.id = :userId', { userId })
      .getOne();

    if (!record) {
      this.logger.warn(
        `[FIND_ONE] Record not found or not authorized. ID: ${id}, UserID: ${userId}`,
      );
      throw new NotFoundException(
        `Maintenance record with ID ${id} not found or not authorized.`,
      );
    }
    return record;
  }

  async update(
    id: number,
    updateRecordDto: UpdateMaintenanceRecordDto,
    userId: number,
  ): Promise<MaintenanceRecord> {
    // this.logger.log(`[UPDATE START] ID: ${id}, UserID: ${userId}, DTO: ${JSON.stringify(updateRecordDto)}`);
    const record = await this.findOne(id, userId);

    if (
      updateRecordDto.vehicle_id &&
      updateRecordDto.vehicle_id !== record.vehicle.id
    ) {
      const newVehicle = await this.vehicleRepository.findOne({
        where: { id: updateRecordDto.vehicle_id, user: { id: userId } },
      });
      if (!newVehicle) {
        this.logger.warn(
          `[UPDATE] New vehicle not found or not authorized. Vehicle ID: ${updateRecordDto.vehicle_id}, UserID: ${userId}`,
        );
        throw new NotFoundException(
          `New vehicle with ID ${updateRecordDto.vehicle_id} not found or not authorized.`,
        );
      }
      record.vehicle = newVehicle;
    }

    if ('component_id' in updateRecordDto) {
      // Check if component_id is explicitly in DTO
      if (updateRecordDto.component_id === null) {
        record.maintenanceComponent = null;
        record.component_id = null;
      } else if (
        updateRecordDto.component_id !==
        (record.maintenanceComponent ? record.maintenanceComponent.id : null)
      ) {
        const newComponent = await this.maintenanceComponentRepository.findOne({
          where: {
            id: updateRecordDto.component_id,
            vehicle: { id: record.vehicle.id },
          },
        });
        if (!newComponent) {
          this.logger.warn(
            `[UPDATE] New component not found for this vehicle. Component ID: ${updateRecordDto.component_id}, Vehicle ID: ${record.vehicle.id}`,
          );
          throw new NotFoundException(
            `New component with ID ${updateRecordDto.component_id} not found for vehicle ${record.vehicle.id}.`,
          );
        }
        record.maintenanceComponent = newComponent; // This should be correct based on entity
        record.component_id = newComponent.id; // Also update the FK
      }
    }

    // Update other properties from DTO, excluding vehicle_id and component_id as they are handled above
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      vehicle_id: _vehicle_id,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      component_id: _component_id,
      ...restOfUpdateDto
    } = updateRecordDto;
    Object.assign(record, restOfUpdateDto);

    if (
      updateRecordDto.maintenance_date &&
      typeof updateRecordDto.maintenance_date === 'string'
    ) {
      record.maintenance_date = new Date(updateRecordDto.maintenance_date);
    }

    // this.logger.log(`[UPDATE] Record properties updated before save: ${JSON.stringify(record)}`);
    try {
      const updatedRecord = await this.maintenanceRecordRepository.save(record);
      // this.logger.log(`[UPDATE SUCCESS] Record updated, ID: ${id}`);
      return updatedRecord;
    } catch (err: unknown) {
      let errorMessage = `Error updating record ${id}`;
      let errorStack: string | undefined;

      if (err instanceof Error) {
        errorMessage = err.message;
        errorStack = err.stack;
      } else {
        errorMessage = String(err);
      }
      this.logger.error(`[UPDATE DB EXCEPTION] ${errorMessage}`, errorStack);
      // Potentially check for error.code for specific DB errors like constraint violations
      throw new InternalServerErrorException(
        `Could not update maintenance record with ID ${id}.`,
      );
    }
  }

  async remove(id: number, userId: number): Promise<void> {
    this.logger.log(`[REMOVE START] ID: ${id}, UserID: ${userId}`);
    const record = await this.findOne(id, userId); // Ensures record exists and belongs to user

    if (!record) {
      // findOne should throw, but as a safeguard
      this.logger.warn(
        `[REMOVE] Record not found by findOne: ID: ${id}, UserID: ${userId}`,
      );
      throw new NotFoundException(
        `Maintenance record with ID ${id} not found.`,
      );
    }

    try {
      const result = await this.maintenanceRecordRepository.delete(record.id);
      if (result.affected === 0) {
        this.logger.warn(
          `[REMOVE] Record not deleted, affected rows 0. ID: ${id}. This might mean it was already deleted.`,
        );
        // No throw here as findOne would have caught it if it didn't exist and was not authorized.
      }
      // this.logger.log(`[REMOVE SUCCESS] Record ID: ${id} deleted.`);
    } catch (err: unknown) {
      let errorMessage = `Error removing record ${id}`;
      let errorStack: string | undefined;

      if (err instanceof Error) {
        errorMessage = err.message;
        errorStack = err.stack;
      } else {
        errorMessage = String(err);
      }
      this.logger.error(`[REMOVE DB EXCEPTION] ${errorMessage}`, errorStack);
      throw new InternalServerErrorException(
        `Could not remove maintenance record with ID ${id}.`,
      );
    }
  }
}
