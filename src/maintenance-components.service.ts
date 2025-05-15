import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceComponent } from './database/entities/maintenance-component.entity';
import { CreateMaintenanceComponentDto } from './dto/create-maintenance-component.dto';
import { UpdateMaintenanceComponentDto } from './dto/update-maintenance-component.dto';
import { Vehicle } from './database/entities/vehicle.entity';
import { MaintenanceRecord } from './database/entities/maintenance-record.entity';
import { MaintenanceRecordsService } from './maintenance-records.service';
import { Inject } from '@nestjs/common';
import { forwardRef } from '@nestjs/common';
import { addDays, formatISO } from 'date-fns';

// Export the enum so controller can use its type
export enum MaintenanceStatus {
  GOOD = 'good',
  ATTENTION = 'attention',
  WARNING = 'warning',
  UNKNOWN = 'unknown',
}

@Injectable()
export class MaintenanceComponentsService {
  private readonly logger = new Logger(MaintenanceComponentsService.name);

  constructor(
    @InjectRepository(MaintenanceComponent)
    private componentsRepository: Repository<MaintenanceComponent>,
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    @Inject(forwardRef(() => MaintenanceRecordsService))
    private recordsService: MaintenanceRecordsService,
  ) {}

  async create(
    createComponentDto: CreateMaintenanceComponentDto,
  ): Promise<MaintenanceComponent> {
    this.logger.log(`[CREATE START] DTO: ${JSON.stringify(createComponentDto)}`);

    const vehicle = await this.vehiclesRepository.findOne({ 
        where: { id: createComponentDto.vehicle_id } 
    });
    if (!vehicle) {
        this.logger.warn(`[CREATE] Vehicle not found, ID: ${createComponentDto.vehicle_id}`);
        throw new BadRequestException(`Vehicle with ID "${createComponentDto.vehicle_id}" not found.`);
    }
    this.logger.log(`[CREATE] Found vehicle: ${JSON.stringify(vehicle)}`);

    const newComponent = this.componentsRepository.create(createComponentDto);
    this.logger.log(`[CREATE] Component entity created (before calculations): ${JSON.stringify(newComponent)}`);

    const now = new Date();
    if (newComponent.maintenance_type === 'mileage') {
      newComponent.target_maintenance_mileage = vehicle.mileage + newComponent.maintenance_value;
      newComponent.target_maintenance_date = null; 
      newComponent.last_maintenance_date = null; 
    } else if (newComponent.maintenance_type === 'date') {
      newComponent.target_maintenance_date = addDays(now, newComponent.maintenance_value);
      newComponent.target_maintenance_mileage = null; 
      newComponent.last_maintenance_date = now;
    } else {
       this.logger.error(`[CREATE] Invalid maintenance type: ${newComponent.maintenance_type}`);
       throw new BadRequestException(`Invalid maintenance type: ${newComponent.maintenance_type}`);
    }
    this.logger.log(`[CREATE] Component after calculations (before save): ${JSON.stringify(newComponent)}`);
    
    try {
      const savedComponent = await this.componentsRepository.save(newComponent);
      this.logger.log(`[CREATE SUCCESS] Saved component: ${JSON.stringify(savedComponent)}`);
      return savedComponent;
    } catch (error) {
      this.logger.error(`[CREATE ERROR] Failed to save component: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(vehicleName?: string): Promise<MaintenanceComponent[]> {
    let vehicleId: number | undefined = undefined;

    if (vehicleName) {
      // Find the vehicle by name to get its ID
      const vehicle = await this.vehiclesRepository.findOneBy({ name: vehicleName });
      if (!vehicle) {
        // If vehicle name is provided but not found, return empty list or throw error?
        // Returning empty list to match original api_service behavior for now.
        // throw new BadRequestException(`Vehicle with name "${vehicleName}" not found`); 
        return [];
      }
      vehicleId = vehicle.id;
    }

    // Use vehicleId (if found) to filter components
    const queryOptions = vehicleId ? { where: { vehicle_id: vehicleId } } : {};
    const components = await this.componentsRepository.find(queryOptions);
    
    // --- ADD LOG --- 
    console.log('[MaintenanceComponentsService] Found components (before serialization):', JSON.stringify(components, null, 2));
    // --- END LOG ---

    return components;
  }

  async findOne(id: number): Promise<MaintenanceComponent> {
    const component = await this.componentsRepository.findOne({ where: { id } });
    if (!component) {
      throw new NotFoundException(`Component with ID "${id}" not found`);
    }
    return component;
  }

  async update(
    id: number,
    updateComponentDto: UpdateMaintenanceComponentDto,
  ): Promise<MaintenanceComponent> {
    this.logger.log(`[UPDATE START] Component ID: ${id}, DTO: ${JSON.stringify(updateComponentDto)}`);

    const component = await this.componentsRepository.preload({
      id: id,
      ...updateComponentDto,
    });
    if (!component) {
      this.logger.warn(`[UPDATE] Component not found for preload, ID: ${id}`);
      throw new NotFoundException(`Component with ID "${id}" not found`);
    }
    this.logger.log(`[UPDATE] Component after preload (before save): ${JSON.stringify(component)}`);

    try {
      const updatedComponent = await this.componentsRepository.save(component);
      this.logger.log(`[UPDATE SUCCESS] Saved component: ${JSON.stringify(updatedComponent)}`);
      return updatedComponent;
    } catch (error) {
      this.logger.error(`[UPDATE ERROR] Failed to save component ID ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    this.logger.log(`[REMOVE START] Component ID: ${id}`);
    
    const componentExists = await this.componentsRepository.findOne({ where: {id }});
    if (!componentExists) {
      this.logger.warn(`[REMOVE] Component not found, ID: ${id}. Cannot delete.`);
      throw new NotFoundException(`Component with ID "${id}" not found`);
    }
    this.logger.log(`[REMOVE] Component found, attempting deletion: ${JSON.stringify(componentExists)}`);

    const result = await this.componentsRepository.delete(id);
    if (result.affected === 0) { 
      this.logger.warn(`[REMOVE WARN] Deletion reported 0 affected rows for ID: ${id}, though it was found.`);
    }
    this.logger.log(`[REMOVE SUCCESS] Component ID: ${id} deleted. Affected rows: ${result.affected}`);
  }

  // --- Business Logic Methods ---

  async calculateStatus(
    componentId: number,
  ): Promise<{ status: MaintenanceStatus; remaining?: number } | { status: MaintenanceStatus } > {
    const component = await this.componentsRepository.findOne({ where: { id: componentId } });
    if (!component) {
      throw new NotFoundException(`Component with ID "${componentId}" not found`);
    }

    const vehicle = await this.vehiclesRepository.findOne({ where: { id: component.vehicle_id } });
    if (!vehicle) {
      // This case should ideally not happen due to foreign key constraints
      // but handle defensively.
      console.error(`Vehicle with ID "${component.vehicle_id}" not found for Component ID "${componentId}"`);
      return { status: MaintenanceStatus.UNKNOWN };
    }

    const currentMileage = vehicle.mileage;
    const now = new Date();

    // Use fixed thresholds like in the original code
    const mileageAttentionThreshold = 100.0;
    const dateAttentionThresholdDays = 15.0;

    if (component.maintenance_type === 'mileage') {
      if (component.target_maintenance_mileage == null) {
        return { status: MaintenanceStatus.UNKNOWN };
      }
      const remaining = component.target_maintenance_mileage - currentMileage;
      if (remaining <= 0) {
        return { status: MaintenanceStatus.WARNING, remaining };
      } else if (remaining <= mileageAttentionThreshold) {
        return { status: MaintenanceStatus.ATTENTION, remaining };
      }
      return { status: MaintenanceStatus.GOOD, remaining };
    } else if (component.maintenance_type === 'date') {
      if (component.target_maintenance_date == null) {
        return { status: MaintenanceStatus.UNKNOWN };
      }
      // Calculate difference in days, considering only date part
      const targetDate = new Date(component.target_maintenance_date);
      targetDate.setHours(0, 0, 0, 0);
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      
      const diffTime = targetDate.getTime() - today.getTime();
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (remainingDays <= 0) {
        return { status: MaintenanceStatus.WARNING, remaining: remainingDays };
      } else if (remainingDays <= dateAttentionThresholdDays) {
        return { status: MaintenanceStatus.ATTENTION, remaining: remainingDays };
      }
      return { status: MaintenanceStatus.GOOD, remaining: remainingDays };
    }

    return { status: MaintenanceStatus.UNKNOWN };
  }

  async calculateProgress(componentId: number): Promise<number> {
    const component = await this.componentsRepository.findOne({ where: { id: componentId } });
    if (!component) {
      throw new NotFoundException(`Component with ID "${componentId}" not found`);
    }
    
    const vehicle = await this.vehiclesRepository.findOne({ where: { id: component.vehicle_id } });
     if (!vehicle) {
       console.error(`Vehicle with ID "${component.vehicle_id}" not found for Component ID "${componentId}"`);
       return 0.0;
     }
     
    const currentMileage = vehicle.mileage;
    const now = new Date();

    if (component.maintenance_type === 'mileage') {
      if (
        component.target_maintenance_mileage == null ||
        component.target_maintenance_mileage <= 0 ||
        component.maintenance_value <= 0
      ) {
        return 0.0;
      }
      const startMileageOfCycle = component.target_maintenance_mileage - component.maintenance_value;
      const cycleLength = component.maintenance_value;
      const progressInCycle = currentMileage - startMileageOfCycle;
      // Clamp ensures result is between 0.0 and 1.0
      return Math.max(0.0, Math.min(1.0, progressInCycle / cycleLength)); 
    } else if (component.maintenance_type === 'date') {
      if (component.target_maintenance_date == null || component.last_maintenance_date == null) {
        return 0.0;
      }
       // Calculate difference in days
      const targetDate = new Date(component.target_maintenance_date);
      const lastDate = new Date(component.last_maintenance_date);
      targetDate.setHours(0, 0, 0, 0);
      lastDate.setHours(0, 0, 0, 0);
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      
      const totalDuration = Math.ceil((targetDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (totalDuration <= 0) {
        return 1.0; // Already past target date
      }
      const elapsedDuration = Math.ceil((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0.0, Math.min(1.0, elapsedDuration / totalDuration)); 
    }

    return 0.0;
  }

  async markAsMaintained(
    componentId: number,
    currentMileage: number,
    recalculateNextTarget: boolean = true,
  ): Promise<MaintenanceComponent> {
    const component = await this.componentsRepository.findOne({ where: { id: componentId } });
    if (!component) {
      throw new NotFoundException(`Component with ID "${componentId}" not found`);
    }

    const vehicle = await this.vehiclesRepository.findOne({ where: { id: component.vehicle_id } });
    if (!vehicle) {
       throw new NotFoundException(`Vehicle with ID "${component.vehicle_id}" not found for Component ID "${componentId}"`);
    }
    
    // 1. Create a new Maintenance Record for this action
    const newRecordDto = {
        vehicle_id: component.vehicle_id,
        component_id: componentId,
        maintenance_date: new Date(), // Use current date for maintenance
        mileage_at_maintenance: currentMileage, 
        notes: 'Marked as maintained via API.' // Add a default note
    };
    
    // Use MaintenanceRecordsService to create the record (this already handles component update if configured)
    // However, the existing create method in RecordsService updates based on DTO values,
    // we need a more direct way to update the component based on the *new* record and the flag.
    // Let's call a potentially new/refactored method in RecordsService or do it here.
    
    // For now, let's implement the update logic directly here, similar to RecordsService.create
    // but using the provided currentMileage and the flag.
    // WARNING: This duplicates logic. Refactoring into a shared private method or 
    // enhancing RecordsService.create would be better in a real application.
    
    const maintenanceDate = new Date();
    component.last_maintenance_date = maintenanceDate;

    if (recalculateNextTarget) { // Only recalculate if the flag is true
      if (component.maintenance_type === 'date') {
        component.target_maintenance_date = addDays(
          maintenanceDate,
          component.maintenance_value,
        );
        component.target_maintenance_mileage = null;
      } else if (component.maintenance_type === 'mileage') {
        component.target_maintenance_mileage =
          currentMileage + component.maintenance_value;
        component.target_maintenance_date = null;
      }
    } 
    // If recalculateNextTarget is false, keep the existing target dates/mileages.

    const updatedComponent = await this.componentsRepository.save(component);
    
    // We should still create the maintenance record for history
    try {
        // We pass all required fields for record creation explicitly
        await this.recordsService.create({
            vehicle_id: component.vehicle_id,
            component_id: componentId,
            maintenance_date: maintenanceDate,
            mileage_at_maintenance: currentMileage,
            notes: 'Marked as maintained via API.' // Consistent note
        });
    } catch (recordError) {
        console.error(`Error creating maintenance record after marking component ${componentId} as maintained:`, recordError);
        // Consider how to handle this: maybe log and continue, or rethrow?
    }

    return updatedComponent; // Return the updated component state
  }
}
