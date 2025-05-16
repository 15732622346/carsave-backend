// src/maintenance-components/maintenance-components.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceComponent } from '../database/entities/maintenance-component.entity';
import { CreateMaintenanceComponentDto, MaintenanceType } from './dto/create-maintenance-component.dto';
import { UpdateMaintenanceComponentDto } from './dto/update-maintenance-component.dto';
import { Vehicle } from '../database/entities/vehicle.entity';
import { MaintenanceRecord } from '../database/entities/maintenance-record.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MaintenanceComponentsService {
  private readonly logger = new Logger(MaintenanceComponentsService.name);

  constructor(
    @InjectRepository(MaintenanceComponent)
    private componentsRepository: Repository<MaintenanceComponent>,
    @InjectRepository(Vehicle) // To check if vehicle exists before associating
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(MaintenanceRecord) // Inject MaintenanceRecordRepository
    private readonly maintenanceRecordsRepository: Repository<MaintenanceRecord>,
    private readonly configService: ConfigService, // For date format
  ) {}

  async create(
    createComponentDto: CreateMaintenanceComponentDto,
  ): Promise<MaintenanceComponent> {
    // this.logger.log(`[CREATE START] DTO: ${JSON.stringify(createComponentDto)}`);
    const { vehicle_id, maintenance_type, maintenance_value, ...restOfDto } = createComponentDto;

    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicle_id } });
    if (!vehicle) {
        this.logger.warn(`[CREATE] Vehicle not found, ID: ${vehicle_id}`);
        throw new NotFoundException(`Vehicle with ID ${vehicle_id} not found.`);
    }
    // this.logger.log(`[CREATE] Vehicle found: ${JSON.stringify(vehicle)}`);

    const dataForEntity: Partial<MaintenanceComponent> = {
        ...restOfDto,
        vehicle: { id: vehicle_id } as Vehicle,
        maintenance_type,
        maintenance_value,
        // Ensure target_maintenance_date is Date or null
        target_maintenance_date: restOfDto.target_maintenance_date ? new Date(restOfDto.target_maintenance_date) : null,
    };

    if (maintenance_type === 'mileage') {
        if (createComponentDto.target_maintenance_mileage === undefined || createComponentDto.target_maintenance_mileage === null) {
            if (vehicle.mileage !== null && vehicle.mileage !== undefined && maintenance_value !== null && maintenance_value !== undefined) {
                dataForEntity.target_maintenance_mileage = vehicle.mileage + maintenance_value;
                // this.logger.log(`[CREATE] Calculated target_maintenance_mileage: ${dataForEntity.target_maintenance_mileage}`);
            } else {
                this.logger.warn('[CREATE] Cannot calculate target_maintenance_mileage due to missing vehicle.mileage or dto.maintenance_value. It will be null.');
                dataForEntity.target_maintenance_mileage = null;
            }
        } else {
            dataForEntity.target_maintenance_mileage = createComponentDto.target_maintenance_mileage;
            // this.logger.log(`[CREATE] Using user-provided target_maintenance_mileage: ${dataForEntity.target_maintenance_mileage}`);
        }
        dataForEntity.target_maintenance_date = null; // Ensure date is null for mileage type
    } else if (maintenance_type === 'date') {
        if (createComponentDto.target_maintenance_date === undefined || createComponentDto.target_maintenance_date === null) {
            if (maintenance_value !== null && maintenance_value !== undefined) {
                const today = new Date();
                today.setDate(today.getDate() + maintenance_value);
                dataForEntity.target_maintenance_date = today // Store as Date object
                // this.logger.log(`[CREATE] Calculated target_maintenance_date: ${dataForEntity.target_maintenance_date.toISOString().split('T')[0]}`);
            } else {
                this.logger.warn('[CREATE] Cannot calculate target_maintenance_date due to missing dto.maintenance_value. It will be null.');
                dataForEntity.target_maintenance_date = null;
            }
        } else {
            // Ensure it's a Date object if a string is passed
            dataForEntity.target_maintenance_date = new Date(createComponentDto.target_maintenance_date);
            // this.logger.log(`[CREATE] Using user-provided target_maintenance_date (already converted): ${dataForEntity.target_maintenance_date}`);
        }
        dataForEntity.target_maintenance_mileage = null; // Ensure mileage is null for date type
    }

    const componentEntity = this.componentsRepository.create(dataForEntity);
    // this.logger.log(`[CREATE] Component entity created with potentially calculated targets: ${JSON.stringify(componentEntity)}`);

    try {
        const savedComponent = await this.componentsRepository.save(componentEntity);
        // this.logger.log(`[CREATE SUCCESS] Component saved, ID: ${savedComponent.id}, Data: ${JSON.stringify(savedComponent)}`);

        // Reload to include relations, especially the vehicle object
        const reloadedComponent = await this.componentsRepository.findOne({
            where: { id: savedComponent.id },
            relations: ['vehicle'],
        });
        if (!reloadedComponent) {
            this.logger.error(`[CREATE] Failed to reload component after save, ID: ${savedComponent.id}`);
            // Potentially throw error or return savedComponent if relations are not strictly needed immediately
            return savedComponent; 
        }
        // this.logger.log(`[CREATE] Component reloaded with relations: ${JSON.stringify(reloadedComponent)}`);
        return reloadedComponent;
    } catch (error) {
        this.logger.error(`[CREATE DB EXCEPTION] Error saving component: ${error.message}`, error.stack);
        if (error.code === '23505') { // Unique constraint violation
            this.logger.warn(`[CREATE] Unique constraint violation: ${error.message}`);
            throw new ConflictException('A component with this name or configuration already exists for this vehicle.');
        }
        throw new InternalServerErrorException('Could not create maintenance component.');
    }
  }

  async findAll(userId: number, vehicleId?: number): Promise<MaintenanceComponent[]> {
    // this.logger.log(`[FIND_ALL START] userId: ${userId}, vehicleId: ${vehicleId}`);
    const queryBuilder = this.componentsRepository.createQueryBuilder('component')
      .leftJoinAndSelect('component.vehicle', 'vehicle')
      .leftJoin('vehicle.user', 'user');

    if (vehicleId) {
      // this.logger.log(`[FIND_ALL] Filtering by vehicleId: ${vehicleId} and userId: ${userId}`);
      queryBuilder.where('vehicle.id = :vehicleId', { vehicleId })
        .andWhere('user.id = :userId', { userId });
    } else {
      // this.logger.log(`[FIND_ALL] Filtering by userId: ${userId} for all vehicles`);
      queryBuilder.where('user.id = :userId', { userId });
    }

    try {
      const components = await queryBuilder.getMany();
      // this.logger.log(`[FIND_ALL SUCCESS] Found ${components.length} components for userId: ${userId}`);
      return components;
    } catch (error) {
      this.logger.error(`[FIND_ALL DB EXCEPTION] Error finding components for userId: ${userId}, vehicleId: ${vehicleId} - ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not retrieve maintenance components.');
    }
  }

  async findOne(id: number, userId: number): Promise<MaintenanceComponent> {
    // this.logger.log(`[FIND_ONE START] ID: ${id}, UserID: ${userId}`);
    const component = await this.componentsRepository.createQueryBuilder('component')
      .leftJoinAndSelect('component.vehicle', 'vehicle')
      .leftJoin('vehicle.user', 'user')
      .where('component.id = :id', { id })
      .andWhere('user.id = :userId', { userId })
      .getOne();

    if (!component) {
      this.logger.warn(`[FIND_ONE] Component not found or not authorized for user. ID: ${id}, UserID: ${userId}`);
      throw new NotFoundException(`Maintenance component with ID ${id} not found or not authorized.`);
    }
    // this.logger.log(`[FIND_ONE SUCCESS] Component found: ${JSON.stringify(component)}`);
    return component;
  }

  async update(
    id: number,
    updateDto: UpdateMaintenanceComponentDto,
    userId: number
  ): Promise<MaintenanceComponent> {
    // this.logger.log(`[UPDATE START] ID: ${id}, UserID: ${userId}, DTO: ${JSON.stringify(updateDto)}`);
    const component = await this.findOne(id, userId); 
    // this.logger.log(`[UPDATE] Component found: ${JSON.stringify(component)}`);

    if (updateDto.vehicle_id && updateDto.vehicle_id !== component.vehicle.id) {
        const newVehicle = await this.vehicleRepository.findOne({ where: { id: updateDto.vehicle_id, user: { id: userId } } });
        if (!newVehicle) {
            this.logger.warn(`[UPDATE] New vehicle not found or not authorized for user. Vehicle ID: ${updateDto.vehicle_id}, UserID: ${userId}`);
            throw new NotFoundException(`New vehicle with ID ${updateDto.vehicle_id} not found or not authorized for this user.`);
        }
        component.vehicle = newVehicle;
        // this.logger.log(`[UPDATE] Vehicle updated for component.`);
    }

    // Update other properties, ensuring date conversion if provided
    const { target_maintenance_date, ...otherUpdateProps } = updateDto;
    Object.assign(component, otherUpdateProps);
    if (target_maintenance_date) {
        component.target_maintenance_date = new Date(target_maintenance_date);
    }

    // this.logger.log(`[UPDATE] Component properties updated before save: ${JSON.stringify(component)}`);

    try {
      const updatedComponent = await this.componentsRepository.save(component);
      // this.logger.log(`[UPDATE SUCCESS] Component updated, ID: ${id}, Data: ${JSON.stringify(updatedComponent)}`);

      const reloadedComponent = await this.componentsRepository.findOne({
        where: { id: updatedComponent.id },
        relations: ['vehicle'],
      });
      if (!reloadedComponent) {
        this.logger.error(`[UPDATE] Failed to reload component after update, ID: ${updatedComponent.id}`);
        return updatedComponent;
      }
      // this.logger.log(`[UPDATE] Component reloaded with relations: ${JSON.stringify(reloadedComponent)}`);
      return reloadedComponent;
    } catch (error) {
      this.logger.error(`[UPDATE DB EXCEPTION] Error updating component: ${error.message}`, error.stack);
      if (error.code === '23505') { // Unique constraint violation
        this.logger.warn(`[UPDATE] Unique constraint violation: ${error.message}`);
        throw new ConflictException('A component with this name or configuration already exists for this vehicle.');
      }
      throw new InternalServerErrorException('Could not update maintenance component.');
    }
  }

  async remove(id: number, userId: number): Promise<void> {
    // this.logger.log(`[REMOVE START] ID: ${id}, UserID: ${userId}`);
    // Ensure the component exists and belongs to the user before attempting to delete
    const component = await this.findOne(id, userId); // Will throw if not found/authorized
    // this.logger.log(`[REMOVE] Component found: ${JSON.stringify(component)}`);

    const result = await this.componentsRepository.delete(id);
    if (result.affected === 0) {
      this.logger.warn(`[REMOVE] No component found to delete with ID: ${id} (already checked, but confirming delete result)`);
      // Not throwing an error here because findOne would have already thrown if not found.
      // This state (affected === 0 after findOne passed) should ideally not be reached.
    } else {
      // this.logger.log(`[REMOVE SUCCESS] Component deleted, ID: ${id}, Affected rows: ${result.affected}`);
    }
  }
} 