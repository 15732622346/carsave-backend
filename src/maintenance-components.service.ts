import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
import { Logger } from '@nestjs/common';
import { User } from 'src/users/user.entity';

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
    user: User,
  ): Promise<MaintenanceComponent> {
    // 1. Find the associated vehicle to get current mileage, ensuring it belongs to the user
    const vehicle = await this.vehiclesRepository.findOne({ 
        where: { id: createComponentDto.vehicle_id, user_id: user.id }
    });
    if (!vehicle) {
        throw new BadRequestException(`Vehicle with ID "${createComponentDto.vehicle_id}" not found or does not belong to this user.`);
    }

    // 2. Create the basic component entity from DTO and assign user_id
    const newComponent = this.componentsRepository.create({
        ...createComponentDto,
        user_id: user.id,
    });

    // 3. Calculate and set initial target values
    const now = new Date();
    if (newComponent.maintenance_type === 'mileage') {
      newComponent.target_maintenance_mileage = vehicle.mileage + newComponent.maintenance_value;
      newComponent.target_maintenance_date = null; // Ensure date target is null
      // Set last_maintenance_date to null initially for mileage components, 
      // or maybe to vehicle manufacturing date if available?
      // For simplicity, let's keep it null unless a record exists.
      newComponent.last_maintenance_date = null; 
    } else if (newComponent.maintenance_type === 'date') {
      // Calculate target date based on current date + interval
      newComponent.target_maintenance_date = addDays(now, newComponent.maintenance_value);
      newComponent.target_maintenance_mileage = null; // Ensure mileage target is null
      // Set last_maintenance_date to today for date-based components 
      // as the cycle starts from now.
      newComponent.last_maintenance_date = now;
    } else {
       // Handle potential unknown maintenance type if enum allows more values
       throw new BadRequestException(`Invalid maintenance type: ${newComponent.maintenance_type}`);
    }
    
    console.log('[MaintenanceComponentsService Create] Component before save:', JSON.stringify(newComponent, null, 2));

    // 4. Save the component with calculated targets
    return this.componentsRepository.save(newComponent);
  }

  async findAll(userId: number, vehicleName?: string): Promise<MaintenanceComponent[]> {
    this.logger.debug(`User ${userId} finding all components, vehicleName: ${vehicleName}`);
    const queryOptions: any = { where: { user_id: userId } };

    if (vehicleName) {
      const vehicle = await this.vehiclesRepository.findOne({ 
          where: { name: vehicleName, user_id: userId }
      });
      if (!vehicle) {
        this.logger.log(`Vehicle with name "${vehicleName}" not found for user ${userId}. Returning empty array.`);
        return [];
      }
      queryOptions.where.vehicle_id = vehicle.id;
    }
    
    this.logger.debug(`Executing findAll query with options: ${JSON.stringify(queryOptions)}`);
    const components = await this.componentsRepository.find(queryOptions);
    
    console.log('[MaintenanceComponentsService] Found components (before serialization):', JSON.stringify(components, null, 2));
    return components;
  }

  async findOne(id: number, userId: number): Promise<MaintenanceComponent> { 
    this.logger.log(`User ${userId} finding maintenance component with id: ${id}`);
    const component = await this.componentsRepository.findOne({ 
      where: { id, user_id: userId } 
    });
    if (!component) {
      throw new NotFoundException(`Component with ID "${id}" not found or does not belong to this user`);
    }
    return component;
  }

  async update(
    id: number,
    updateComponentDto: UpdateMaintenanceComponentDto,
    userId: number, 
  ): Promise<MaintenanceComponent> {
    this.logger.log(`User ${userId} updating maintenance component with id: ${id}`);
    const existingComponent = await this.componentsRepository.findOne({ where: {id, user_id: userId }});
    if (!existingComponent) {
        throw new NotFoundException(`Component with ID "${id}" not found or does not belong to this user`);
    }

    if (updateComponentDto.vehicle_id && updateComponentDto.vehicle_id !== existingComponent.vehicle_id) {
      const vehicle = await this.vehiclesRepository.findOne({
          where: { id: updateComponentDto.vehicle_id, user_id: userId }
      });
      if (!vehicle) {
          throw new BadRequestException(`New Vehicle ID "${updateComponentDto.vehicle_id}" not found or does not belong to this user.`);
      }
    }

    const componentToUpdate = await this.componentsRepository.preload({
      id: id, 
      ...updateComponentDto,
    });

    if (!componentToUpdate) {
      throw new NotFoundException(`Component with ID "${id}" not found during preload.`);
    }
    if (componentToUpdate.user_id !== userId) {
        this.logger.warn(`Preloaded component ${id} user_id ${componentToUpdate.user_id} does not match requesting user ${userId}.`);
        throw new NotFoundException(`Component with ID "${id}" access denied.`);
    }
    return this.componentsRepository.save(componentToUpdate);
  }

  async remove(id: number, userId: number): Promise<void> { 
    this.logger.log(`User ${userId} removing maintenance component with id: ${id}`);
    const componentToRemove = await this.componentsRepository.findOne({ where: { id, user_id: userId }});
    if (!componentToRemove) {
      throw new NotFoundException(`Component with ID "${id}" not found or does not belong to this user`);
    }
    const result = await this.componentsRepository.delete({ id, user_id: userId }); 
    if (result.affected === 0) {
      throw new NotFoundException(`Component with ID "${id}" could not be removed for this user.`);
    }
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
    userId: number, // Added userId
  ): Promise<MaintenanceComponent> {
    this.logger.log(`User ${userId} marking component ${componentId} as maintained. Mileage: ${currentMileage}`);
    const component = await this.componentsRepository.findOne({ 
      where: { id: componentId, user_id: userId } 
    });
    if (!component) {
      throw new NotFoundException(`Component with ID "${componentId}" not found or does not belong to this user`);
    }

    const vehicle = await this.vehiclesRepository.findOne({ 
        where: { id: component.vehicle_id, user_id: userId } 
    });
    if (!vehicle) {
        throw new BadRequestException(`Associated vehicle not found or does not belong to this user.`);
    }
    
    if (currentMileage > vehicle.mileage) {
      vehicle.mileage = currentMileage;
      await this.vehiclesRepository.save(vehicle); 
    } else {
      this.logger.warn(`Provided mileage ${currentMileage} for component ${componentId} is <= current vehicle mileage ${vehicle.mileage}. Using vehicle mileage for calculations.`);
    }

    const now = new Date();
    const savedRecord = await this.recordsService.createForComponentMaintained(
      {
        vehicle_id: component.vehicle_id,
        component_id: component.id,
        maintenance_date: now,
        mileage_at_maintenance: currentMileage, 
        notes: `Component "${component.name}" maintained.`,
      },
      userId, 
    );

    component.last_maintenance_date = now;
    if (recalculateNextTarget) {
      if (component.maintenance_type === 'mileage') {
        component.target_maintenance_mileage = currentMileage + component.maintenance_value;
        component.target_maintenance_date = null;
      } else if (component.maintenance_type === 'date') {
        component.target_maintenance_date = addDays(now, component.maintenance_value);
        component.target_maintenance_mileage = null;
      }
    }
    this.logger.debug(`[MaintenanceComponentsService markAsMaintained] Component ${componentId} after update: ${JSON.stringify(component,null, 2)}`)
    return this.componentsRepository.save(component);
  }
}
