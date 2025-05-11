import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
  ): Promise<MaintenanceRecord> {
    // Validate foreign keys before creating
    const vehicleExists = await this.vehiclesRepository.findOneBy({
      id: createRecordDto.vehicle_id,
    });
    if (!vehicleExists) {
      throw new BadRequestException(
        `Vehicle with ID "${createRecordDto.vehicle_id}" not found`,
      );
    }

    const component = await this.componentsRepository.findOneBy({
      id: createRecordDto.component_id,
      vehicle_id: createRecordDto.vehicle_id, // Ensure component belongs to the vehicle
    });
    if (!component) {
      throw new BadRequestException(
        `Component with ID "${createRecordDto.component_id}" not found or does not belong to vehicle ID "${createRecordDto.vehicle_id}"`,
      );
    }

    // --- Save the new record --- 
    const newRecord = this.recordsRepository.create(createRecordDto);
    const savedRecord = await this.recordsRepository.save(newRecord);

    // --- Update the related component --- 
    try {
      component.last_maintenance_date = savedRecord.maintenance_date;

      if (component.maintenance_type === 'date') {
        // Calculate next target date
        component.target_maintenance_date = addDays(
          savedRecord.maintenance_date,
          component.maintenance_value, // maintenance_value is in days for date type
        );
        component.target_maintenance_mileage = null; // Clear mileage target if type is date
      } else if (component.maintenance_type === 'mileage') {
        // Calculate next target mileage
        if (savedRecord.mileage_at_maintenance == null) {
          // Handle missing mileage - maybe throw error or use vehicle's current?
          // For now, we log a warning and don't update target mileage.
          // Consider adding validation in DTO to require mileage for mileage-based components.
          console.warn(
            `Mileage not provided for mileage-based component record (Component ID: ${component.id}, Record ID: ${savedRecord.id}). Target mileage not updated.`,
          );
          component.target_maintenance_mileage = null; // Or keep old value?
        } else {
          component.target_maintenance_mileage = 
            savedRecord.mileage_at_maintenance + component.maintenance_value;
        }
        component.target_maintenance_date = null; // Clear date target if type is mileage
      }

      await this.componentsRepository.save(component);
    } catch (error) {
        // Log the error but don't necessarily fail the record creation?
        // Or wrap both saves in a transaction later.
        console.error(
          `Error updating component (ID: ${component.id}) after creating record (ID: ${savedRecord.id}):`, 
          error
        );
        // Depending on requirements, you might want to throw an error here
        // or implement a compensation mechanism (e.g., delete the saved record).
    }

    return savedRecord; // Return the newly created record
  }

  async findAll(vehicleIdParam?: number, componentId?: number): Promise<MaintenanceRecord[]> {
    console.log(`[MaintenanceRecordsService] findAll - Received vehicleIdParam: ${vehicleIdParam}, componentId: ${componentId}`);
    const where: any = {};

    // Use vehicleIdParam directly if provided
    if (vehicleIdParam !== undefined) {
      where.vehicle_id = vehicleIdParam; 
    }

    // Add componentId to where clause if provided
    if (componentId !== undefined) {
      where.component_id = componentId;
    }
    
    console.log(`[MaintenanceRecordsService] findAll - Constructed where clause:`, JSON.stringify(where));

    const records = await this.recordsRepository.find({ 
      where, 
      order: { maintenance_date: 'DESC' } 
    });

    console.log(`[MaintenanceRecordsService] findAll - Records found: ${records.length}`);
    // Optionally, log the full records if the list isn't too long, or just relevant parts
    records.forEach(record => {
      console.log(`  - Record ID: ${record.id}, Vehicle ID: ${record.vehicle_id}, Component ID: ${record.component_id}, Date: ${record.maintenance_date}`);
    });

    return records;
  }

  async findOne(id: number): Promise<MaintenanceRecord> {
    const record = await this.recordsRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Record with ID "${id}" not found`);
    }
    return record;
  }

  async update(
    id: number,
    updateRecordDto: UpdateMaintenanceRecordDto,
  ): Promise<MaintenanceRecord> {
    // Optionally validate foreign keys if they are part of the update DTO
    if (
      updateRecordDto.vehicle_id &&
      !(await this.vehiclesRepository.findOneBy({ id: updateRecordDto.vehicle_id }))
    ) {
      throw new BadRequestException(
        `Vehicle with ID "${updateRecordDto.vehicle_id}" not found`,
      );
    }
    if (
      updateRecordDto.component_id &&
      !(await this.componentsRepository.findOneBy({ id: updateRecordDto.component_id }))
    ) {
      throw new BadRequestException(
        `Component with ID "${updateRecordDto.component_id}" not found`,
      );
    }
    // Add check to ensure component belongs to vehicle if both are updated

    const record = await this.recordsRepository.preload({
      id: id,
      ...updateRecordDto,
    });
    if (!record) {
      throw new NotFoundException(`Record with ID "${id}" not found`);
    }
    return this.recordsRepository.save(record);
  }

  async remove(id: number): Promise<void> {
    const result = await this.recordsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Record with ID "${id}" not found`);
    }
  }

  // TODO: Add logic related to updating MaintenanceComponent.last_maintenance_date when a record is added/updated
}
