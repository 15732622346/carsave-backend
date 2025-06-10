// src/maintenance-components/maintenance-components.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { MaintenanceComponent } from '../database/entities/maintenance-component.entity';
import {
  CreateMaintenanceComponentDto,
  MaintenanceType,
} from './dto/create-maintenance-component.dto';
import { UpdateMaintenanceComponentDto } from './dto/update-maintenance-component.dto';
import { Vehicle } from '../database/entities/vehicle.entity';
import { MaintenanceRecord } from '../database/entities/maintenance-record.entity';
import { ConfigService } from '@nestjs/config';

interface ErrorWithCode extends Error {
  code?: string | number;
}

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
    userId: number,
  ): Promise<MaintenanceComponent> {
    this.logger.log(
      `[CREATE START] UserID: ${userId}, DTO: ${JSON.stringify(createComponentDto)}`,
    );

    const { vehicle_id, maintenance_type, maintenance_value, ...restOfDto } =
      createComponentDto;

    // Validate vehicle existence and ownership
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicle_id, user: { id: userId } },
    });
    if (!vehicle) {
      this.logger.warn(
        `[CREATE] Vehicle not found or does not belong to user. VehicleID: ${vehicle_id}, UserID: ${userId}`,
      );
      throw new NotFoundException(
        `Vehicle with ID "${vehicle_id}" not found or not associated with your account.`,
      );
    }
    // this.logger.log(`[CREATE] Vehicle found: ${JSON.stringify(vehicle)}`);

    const dataForEntity: Partial<MaintenanceComponent> = {
      ...restOfDto,
      vehicle: { id: vehicle_id } as Vehicle, // Link to existing vehicle by ID
      maintenance_type, // This is of type MaintenanceType from the DTO
      maintenance_value,
      // Ensure target_maintenance_date is a Date object or null
      target_maintenance_date: restOfDto.target_maintenance_date
        ? new Date(restOfDto.target_maintenance_date)
        : null,
    };

    // Conditional logic for target_maintenance_mileage and target_maintenance_date
    if (maintenance_type === MaintenanceType.MILEAGE) {
      // 目标里程可选：未传则自动推算
      const currentMileage = vehicle.mileage;
      const minTargetMileage = currentMileage + maintenance_value;
      if (
        createComponentDto.target_maintenance_mileage === undefined ||
        createComponentDto.target_maintenance_mileage === null
      ) {
        dataForEntity.target_maintenance_mileage = minTargetMileage;
      } else {
        if (createComponentDto.target_maintenance_mileage <= minTargetMileage) {
          throw new ConflictException(
            `目标里程必须大于车辆当前里程(${currentMileage})加保养周期(${maintenance_value})，即 > ${minTargetMileage}`,
          );
        }
        dataForEntity.target_maintenance_mileage = createComponentDto.target_maintenance_mileage;
      }
      dataForEntity.target_maintenance_date = null; // Ensure date is null for mileage type
    } else if (maintenance_type === MaintenanceType.DATE) {
      if (!restOfDto.target_maintenance_date) {
        throw new ConflictException(
          'target_maintenance_date is required for date-based maintenance type.',
        );
      }
      dataForEntity.target_maintenance_mileage = null; // Ensure mileage is null for date type
    }

    const componentEntity = this.componentsRepository.create(
      dataForEntity as DeepPartial<MaintenanceComponent>,
    );
    // this.logger.log(`[CREATE] Component entity created: ${JSON.stringify(componentEntity)}`);

    try {
      const savedComponent =
        await this.componentsRepository.save(componentEntity);
      // this.logger.log(`[CREATE SUCCESS] Component saved, ID: ${savedComponent.id}, Data: ${JSON.stringify(savedComponent)}`);

      // Reload to include relations, especially the vehicle object
      const reloadedComponent = await this.componentsRepository.findOne({
        where: { id: savedComponent.id },
        relations: ['vehicle'],
      });
      if (!reloadedComponent) {
        this.logger.error(
          `[CREATE] Failed to reload component after save, ID: ${savedComponent.id}`,
        );
        // Potentially throw error or return savedComponent if relations are not strictly needed immediately
        return savedComponent;
      }
      // this.logger.log(`[CREATE] Component reloaded with relations: ${JSON.stringify(reloadedComponent)}`);
      return reloadedComponent;
    } catch (err: unknown) {
      let errorMessage = 'Error saving component';
      let errorStack: string | undefined;
      let errorCode: string | number | undefined = undefined;

      if (err instanceof Error) {
        errorMessage = err.message;
        errorStack = err.stack;
        if ('code' in err) {
          errorCode = (err as ErrorWithCode).code;
        }
      } else {
        errorMessage = String(err);
      }

      this.logger.error(`[CREATE DB EXCEPTION] ${errorMessage}`, errorStack);
      if (errorCode === '23505') {
        this.logger.warn(
          `[CREATE] Unique constraint violation: ${errorMessage}`,
        );
        throw new ConflictException(
          'A component with this name or details already exists for this vehicle.',
        );
      }
      throw new InternalServerErrorException(errorMessage);
    }
  }

  async findAll(
    userId: number,
    vehicleId?: number,
  ): Promise<MaintenanceComponent[]> {
    // this.logger.log(`[FIND_ALL START] userId: ${userId}, vehicleId: ${vehicleId}`);
    const queryBuilder = this.componentsRepository
      .createQueryBuilder('component')
      .leftJoinAndSelect('component.vehicle', 'vehicle')
      .leftJoin('vehicle.user', 'user');

    if (vehicleId) {
      // this.logger.log(`[FIND_ALL] Filtering by vehicleId: ${vehicleId} and userId: ${userId}`);
      queryBuilder
        .where('vehicle.id = :vehicleId', { vehicleId })
        .andWhere('user.id = :userId', { userId });
    } else {
      // this.logger.log(`[FIND_ALL] Filtering by userId: ${userId} for all vehicles`);
      queryBuilder.where('user.id = :userId', { userId });
    }

    try {
      const components = await queryBuilder.getMany();
      // this.logger.log(`[FIND_ALL SUCCESS] Found ${components.length} components for userId: ${userId}`);
      return components;
    } catch (err: unknown) {
      let errorMessage = 'Error finding components';
      let errorStack: string | undefined;

      if (err instanceof Error) {
        errorMessage = err.message;
        errorStack = err.stack;
      } else {
        errorMessage = String(err);
      }
      this.logger.error(
        `[FIND_ALL DB EXCEPTION] UserID: ${userId}, VehicleID: ${vehicleId} - ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        'Could not retrieve maintenance components.',
      );
    }
  }

  async findOne(id: number, userId: number): Promise<MaintenanceComponent> {
    // this.logger.log(`[FIND_ONE START] ID: ${id}, UserID: ${userId}`);
    const component = await this.componentsRepository
      .createQueryBuilder('component')
      .leftJoinAndSelect('component.vehicle', 'vehicle')
      .leftJoin('vehicle.user', 'user')
      .where('component.id = :id', { id })
      .andWhere('user.id = :userId', { userId })
      .getOne();

    if (!component) {
      this.logger.warn(
        `[FIND_ONE] Component not found or not authorized for user. ID: ${id}, UserID: ${userId}`,
      );
      throw new NotFoundException(
        `Maintenance component with ID ${id} not found or not authorized.`,
      );
    }
    // this.logger.log(`[FIND_ONE SUCCESS] Component found: ${JSON.stringify(component)}`);
    return component;
  }

  async update(
    id: number,
    updateDto: UpdateMaintenanceComponentDto,
    userId: number,
  ): Promise<MaintenanceComponent> {
    this.logger.log(
      `[UPDATE START] ID: ${id}, UserID: ${userId}, DTO: ${JSON.stringify(updateDto)}`,
    );
    const component = await this.findOne(id, userId);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { vehicle_id: _vehicle_id_unused, ...restOfUpdateDto } = updateDto;

    Object.assign(component, restOfUpdateDto);

    if (restOfUpdateDto.target_maintenance_date) {
      component.target_maintenance_date = new Date(
        restOfUpdateDto.target_maintenance_date,
      );
    }

    if (updateDto.maintenance_type) {
      if (updateDto.maintenance_type === MaintenanceType.MILEAGE) {
        if (
          updateDto.target_maintenance_mileage === undefined ||
          updateDto.target_maintenance_mileage === null
        ) {
          throw new ConflictException(
            'target_maintenance_mileage is required for mileage-based maintenance type.',
          );
        }
        component.target_maintenance_mileage =
          updateDto.target_maintenance_mileage;
        component.target_maintenance_date = null;
      } else if (updateDto.maintenance_type === MaintenanceType.DATE) {
        if (!updateDto.target_maintenance_date) {
          throw new ConflictException(
            'target_maintenance_date is required for date-based maintenance type.',
          );
        }
        component.target_maintenance_date = new Date(
          updateDto.target_maintenance_date,
        );
        component.target_maintenance_mileage = null;
      }
    } else {
      if (
        component.maintenance_type === MaintenanceType.MILEAGE &&
        updateDto.target_maintenance_mileage !== undefined
      ) {
        component.target_maintenance_mileage =
          updateDto.target_maintenance_mileage;
      }
      if (
        component.maintenance_type === MaintenanceType.DATE &&
        updateDto.target_maintenance_date !== undefined
      ) {
        component.target_maintenance_date = new Date(
          updateDto.target_maintenance_date,
        );
      }
    }

    try {
      await this.componentsRepository.save(component);
      return this.findOne(id, userId);
    } catch (err: unknown) {
      let errorMessage = `Error updating component ${id}`;
      let errorStack: string | undefined;
      let errorCode: string | number | undefined = undefined;

      if (err instanceof Error) {
        errorMessage = err.message;
        errorStack = err.stack;
        if ('code' in err) {
          errorCode = (err as ErrorWithCode).code;
        }
      } else {
        errorMessage = String(err);
      }

      this.logger.error(`[UPDATE DB EXCEPTION] ${errorMessage}`, errorStack);
      if (errorCode === '23505') {
        throw new ConflictException(
          'Update failed due to a conflict (e.g., name already exists for this vehicle).',
        );
      }
      throw new InternalServerErrorException(errorMessage);
    }
  }

  async remove(id: number, userId: number): Promise<void> {
    // this.logger.log(`[REMOVE START] ID: ${id}, UserID: ${userId}`);
    // Ensure the component exists and belongs to the user before attempting to delete
    // const component = await this.findOne(id, userId); // Will throw if not found/authorized <-- REMOVE THIS LINE
    // this.logger.log(`[REMOVE] Component found: ${JSON.stringify(component)}`);

    try {
      // First, ensure the component belongs to the user by trying to fetch it.
      // The findOne method already throws NotFoundException if not found or not authorized.
      await this.findOne(id, userId); // Keep this call for check within try block
      // this.logger.log(`[REMOVE] Component found, proceeding with deletion. ID: ${id}`);

      // Manually delete related maintenance records first
      const deleteRecordsResult = await this.maintenanceRecordsRepository
        .createQueryBuilder()
        .delete()
        .from(MaintenanceRecord)
        .where('component_id = :id', { id })
        .execute();
      this.logger.log(
        `[REMOVE] Deleted ${deleteRecordsResult.affected || 0} related maintenance records for component ID: ${id}`,
      );

      const result = await this.componentsRepository.delete(id);

      if (result.affected === 0) {
        this.logger.warn(
          `[REMOVE] Component not deleted, affected rows 0. ID: ${id}. This might mean it was already deleted.`,
        );
        // No throw here, as findOne would have thrown if it didn't exist.
        // If it existed and now affected is 0, it might be a concurrent deletion.
        // For a soft delete, this might be different. For hard delete, this is okay.
      }
      // this.logger.log(`[REMOVE SUCCESS] Component ID: ${id} deleted successfully.`);
    } catch (err: unknown) {
      let errorMessage = `Error removing component ${id}`;
      let errorStack: string | undefined;

      if (err instanceof Error) {
        errorMessage = err.message;
        errorStack = err.stack;
      } else {
        errorMessage = String(err);
      }

      this.logger.error(`[REMOVE DB EXCEPTION] ${errorMessage}`, errorStack);
      throw new InternalServerErrorException(
        `Could not remove maintenance component with ID ${id}.`,
      );
    }
  }
}
