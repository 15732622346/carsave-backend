// src/maintenance-components/maintenance-components.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceComponent } from '../database/entities/maintenance-component.entity';
import { CreateMaintenanceComponentDto, MaintenanceType } from './dto/create-maintenance-component.dto';
import { UpdateMaintenanceComponentDto } from './dto/update-maintenance-component.dto';
import { Vehicle } from '../database/entities/vehicle.entity';
import { MaintenanceRecord } from '../database/entities/maintenance-record.entity';

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
  ) {}

  async create(
    createComponentDto: CreateMaintenanceComponentDto,
  ): Promise<MaintenanceComponent> {
    this.logger.log(`[CREATE START] DTO: ${JSON.stringify(createComponentDto)}`);

    const vehicle = await this.vehicleRepository.findOne({ 
        where: { id: createComponentDto.vehicle_id } 
    });
    if (!vehicle) {
        this.logger.warn(`[CREATE] Vehicle not found, ID: ${createComponentDto.vehicle_id}`);
        throw new BadRequestException(`Vehicle with ID "${createComponentDto.vehicle_id}" not found.`);
    }
    
    this.logger.log(`[CREATE] Vehicle found: ${JSON.stringify(vehicle)}`);

    // Prepare data for entity creation, including calculating targets if not provided
    const dataForEntity: Partial<MaintenanceComponent> = {
      ...createComponentDto,
      vehicle: vehicle,
      // Handle target_maintenance_date type conversion initially
      target_maintenance_date: createComponentDto.target_maintenance_date 
                                  ? new Date(createComponentDto.target_maintenance_date) 
                                  : null,
    };
    // Remove the original string date from DTO if it was spread, to avoid type conflict
    // @ts-ignore
    delete dataForEntity.target_maintenance_date_string_from_dto; // Assuming a placeholder if needed, but direct assignment above is better

    if (createComponentDto.maintenance_type === MaintenanceType.MILEAGE) {
      if (createComponentDto.target_maintenance_mileage === null || createComponentDto.target_maintenance_mileage === undefined) {
        if (vehicle.mileage !== null && vehicle.mileage !== undefined && createComponentDto.maintenance_value) {
          dataForEntity.target_maintenance_mileage = vehicle.mileage + createComponentDto.maintenance_value;
          this.logger.log(`[CREATE] Calculated target_maintenance_mileage: ${dataForEntity.target_maintenance_mileage}`);
        } else {
          this.logger.warn('[CREATE] Cannot calculate target_maintenance_mileage due to missing vehicle.mileage or dto.maintenance_value. It will be null.');
          dataForEntity.target_maintenance_mileage = null;
        }
      } else {
        dataForEntity.target_maintenance_mileage = createComponentDto.target_maintenance_mileage;
        this.logger.log(`[CREATE] Using user-provided target_maintenance_mileage: ${dataForEntity.target_maintenance_mileage}`);
      }
    } else if (createComponentDto.maintenance_type === MaintenanceType.DATE) {
      // target_maintenance_date is already handled above during dataForEntity initialization if provided by user.
      // Now, handle the case where it was NOT provided by the user.
      if (dataForEntity.target_maintenance_date === null || dataForEntity.target_maintenance_date === undefined) { // Check the potentially converted value
        if (createComponentDto.maintenance_value) {
          const currentDate = new Date();
          const targetDate = new Date(currentDate);
          targetDate.setDate(currentDate.getDate() + createComponentDto.maintenance_value);
          dataForEntity.target_maintenance_date = targetDate;
          this.logger.log(`[CREATE] Calculated target_maintenance_date: ${dataForEntity.target_maintenance_date.toISOString().split('T')[0]}`);
        } else {
          this.logger.warn('[CREATE] Cannot calculate target_maintenance_date due to missing dto.maintenance_value. It will be null.');
          dataForEntity.target_maintenance_date = null; 
        }
      } else {
         // User provided target_maintenance_date, already converted to Date and assigned to dataForEntity.target_maintenance_date
        this.logger.log(`[CREATE] Using user-provided target_maintenance_date (already converted): ${dataForEntity.target_maintenance_date}`);
      }
    }

    // Actual database operation
    try {
      // TypeORM's create method expects a plain object that matches the entity structure.
      // Ensure all provided fields in dataForEntity are valid for MaintenanceComponent.
      const componentEntity = this.componentsRepository.create(dataForEntity as MaintenanceComponent); // Cast to assure type if needed
      this.logger.log(`[CREATE] Component entity created with potentially calculated targets: ${JSON.stringify(componentEntity)}`);
      
      const savedComponent = await this.componentsRepository.save(componentEntity);
      this.logger.log(`[CREATE SUCCESS] Component saved, ID: ${savedComponent.id}, Data: ${JSON.stringify(savedComponent)}`);
      
      // Reload to include relations properly
      const reloadedComponent = await this.componentsRepository.findOne({
        where: { id: savedComponent.id },
        relations: ['vehicle'],
      });
      if (!reloadedComponent) {
        this.logger.error(`[CREATE] Failed to reload component after save, ID: ${savedComponent.id}`);
        throw new NotFoundException(`Failed to retrieve created component with ID ${savedComponent.id}`);
      }
      this.logger.log(`[CREATE] Component reloaded with relations: ${JSON.stringify(reloadedComponent)}`);
      return reloadedComponent;
    } catch (error) {
      this.logger.error(`[CREATE DB EXCEPTION] Error saving component: ${error.message}`, error.stack);
      if (error.code === '23505' || (error.constructor.name === 'QueryFailedError' && error.message.toLowerCase().includes('unique constraint'))) {
        this.logger.warn(`[CREATE] Unique constraint violation: ${error.message}`);
        throw new BadRequestException('A component with similar details already exists or violates a unique constraint.');
      }
      throw error; // Re-throw other errors
    }
  }

  async findAll(vehicleId?: number, vehicleName?: string): Promise<MaintenanceComponent[]> {
    this.logger.log(`[FIND_ALL START] vehicleId: ${vehicleId}, vehicleName: ${vehicleName}`);
    
    const findOptions: import('typeorm').FindManyOptions<MaintenanceComponent> = {
      relations: ['vehicle'], // Always load the vehicle relation
      order: { name: 'ASC' }, // Optional: order by name or another field
    };

    if (vehicleId) {
      this.logger.log(`[FIND_ALL] Filtering by vehicleId: ${vehicleId}`);
      findOptions.where = { vehicle: { id: vehicleId } };
    } else if (vehicleName) {
      this.logger.log(`[FIND_ALL] Filtering by vehicleName: ${vehicleName}`);
      // This requires joining with vehicles and filtering by vehicle.name
      // For simplicity with basic FindOptions, if you need this, consider a QueryBuilder
      // Or ensure vehicleName is unique and you fetch vehicleId first.
      // As a basic approach, if vehicleName is passed, we might need to fetch all and filter in memory or use QueryBuilder.
      // For now, this example will show how to do it if vehicleId is prioritized.
      // If only vehicleName is available, a more complex query is needed.
      // Let's assume for now we primarily filter by vehicleId if provided.
      // If you have a direct relation or a way to query by vehicle name efficiently:
      // findOptions.where = { vehicle: { name: vehicleName } }; // This might work if 'name' is a direct column and indexed.
      // However, filtering by related entity's property typically needs a join, best done with QueryBuilder.
      // For this example, we'll keep it simple and prioritize vehicleId.
      // If only vehicleName is given, it won't filter by it directly here without QueryBuilder.
      // A better approach for vehicleName would be: fetch vehicle by name, then use its ID.
    }

    try {
      const components = await this.componentsRepository.find(findOptions);
      this.logger.log(`[FIND_ALL SUCCESS] Found ${components.length} components.`);
      return components;
    } catch (error) {
      this.logger.error(`[FIND_ALL DB EXCEPTION] Error finding components: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number): Promise<MaintenanceComponent> {
    this.logger.log(`[FIND_ONE START] ID: ${id}`);
    try {
      const component = await this.componentsRepository.findOne({
        where: { id },
        relations: ['vehicle'], // Load the vehicle relation
      });

      if (!component) {
        this.logger.warn(`[FIND_ONE] Component not found, ID: ${id}`);
        throw new NotFoundException(`MaintenanceComponent with ID "${id}" not found.`);
      }
      this.logger.log(`[FIND_ONE SUCCESS] Component found: ${JSON.stringify(component)}`);
      return component;
    } catch (error) {
      this.logger.error(`[FIND_ONE DB EXCEPTION] Error finding component: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(
    id: number,
    updateDto: UpdateMaintenanceComponentDto,
  ): Promise<MaintenanceComponent> {
    this.logger.log(`[UPDATE START] ID: ${id}, DTO: ${JSON.stringify(updateDto)}`);
    
    const component = await this.componentsRepository.findOne({ 
        where: { id },
        relations: ['vehicle'] 
    });
    if (!component) {
      this.logger.warn(`[UPDATE] Component not found, ID: ${id}`);
      throw new NotFoundException(`MaintenanceComponent with ID "${id}" not found.`);
    }
    this.logger.log(`[UPDATE] Component found: ${JSON.stringify(component)}`);

    // Check if vehicle_id is being updated and if the new vehicle exists
    if (updateDto.vehicle_id && updateDto.vehicle_id !== component.vehicle.id) {
      const newVehicle = await this.vehicleRepository.findOne({ where: { id: updateDto.vehicle_id } });
      if (!newVehicle) {
        this.logger.warn(`[UPDATE] New vehicle not found for ID: ${updateDto.vehicle_id}`);
        throw new BadRequestException(`Vehicle with ID "${updateDto.vehicle_id}" not found for update.`);
      }
      component.vehicle = newVehicle;
      this.logger.log(`[UPDATE] Vehicle updated for component.`);
    }

    // Update other properties
    Object.assign(component, { ...updateDto, vehicle_id: undefined }); // vehicle_id handled above by assigning component.vehicle
    this.logger.log(`[UPDATE] Component properties updated before save: ${JSON.stringify(component)}`);

    try {
      const updatedComponent = await this.componentsRepository.save(component);
      this.logger.log(`[UPDATE SUCCESS] Component updated, ID: ${id}, Data: ${JSON.stringify(updatedComponent)}`);
       // Reload to ensure relations are fresh if needed, or just return updatedComponent if relations are managed correctly by save
      const reloadedComponent = await this.componentsRepository.findOne({
        where: { id: updatedComponent.id },
        relations: ['vehicle'],
      });
      if (!reloadedComponent) {
        this.logger.error(`[UPDATE] Failed to reload component after update, ID: ${updatedComponent.id}`);
        throw new NotFoundException(`Failed to retrieve updated component with ID ${updatedComponent.id}`);
      }
      this.logger.log(`[UPDATE] Component reloaded with relations: ${JSON.stringify(reloadedComponent)}`);
      return reloadedComponent;
    } catch (error) {
      this.logger.error(`[UPDATE DB EXCEPTION] Error updating component: ${error.message}`, error.stack);
      if (error.code === '23505' || (error.constructor.name === 'QueryFailedError' && error.message.toLowerCase().includes('unique constraint'))) {
        this.logger.warn(`[UPDATE] Unique constraint violation: ${error.message}`);
        throw new BadRequestException('Update violates a unique constraint.');
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    this.logger.log(`[REMOVE START] ID: ${id}`);
    const component = await this.componentsRepository.findOne({ where: { id } });
    if (!component) {
      this.logger.warn(`[REMOVE] Component not found, ID: ${id}`);
      throw new NotFoundException(`MaintenanceComponent with ID "${id}" not found.`);
    }
    this.logger.log(`[REMOVE] Component found: ${JSON.stringify(component)}`);
    
    try {
      const result = await this.componentsRepository.delete(id);
      if (result.affected === 0) {
        this.logger.warn(`[REMOVE] No component found to delete with ID: ${id} (already checked, but confirming delete result)`);
        throw new NotFoundException(`MaintenanceComponent with ID "${id}" not found during delete operation.`);
      }
      this.logger.log(`[REMOVE SUCCESS] Component deleted, ID: ${id}, Affected rows: ${result.affected}`);
    } catch (error) {
      this.logger.error(`[REMOVE DB EXCEPTION] Error deleting component: ${error.message}`, error.stack);
      // Handle potential foreign key constraints or other DB errors if necessary, though handled by records check above for now
      throw error;
    }
  }
} 