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

    // Actual database operation
    try {
      const componentEntity = this.componentsRepository.create({
        ...createComponentDto,
        vehicle,
      });
      this.logger.log(`[CREATE] Component entity created: ${JSON.stringify(componentEntity)}`);
      
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
    
    // Check for related MaintenanceRecords
    const relatedRecords = await this.maintenanceRecordsRepository.find({
      where: { maintenanceComponent: { id: id } },
    });

    if (relatedRecords.length > 0) {
      this.logger.warn(`[REMOVE] Component ID: ${id} has ${relatedRecords.length} related maintenance records. Deletion aborted.`);
      throw new BadRequestException(
        `保养组件 (ID: ${id}) 存在 ${relatedRecords.length} 条关联的保养记录，无法直接删除。请先删除或处理这些保养记录。`,
      );
    }
    this.logger.log(`[REMOVE] No related maintenance records found for component ID: ${id}. Proceeding with deletion.`);

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