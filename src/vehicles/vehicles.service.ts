import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../database/entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { User } from '../database/entities/user.entity'; // Import User entity

// Define ErrorWithCode interface if not already available globally/imported
interface ErrorWithCode extends Error {
  code?: string | number;
}

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
  ) {}

  async create(
    createVehicleDto: CreateVehicleDto,
    userId: number,
  ): Promise<Vehicle> {
    this.logger.log(
      `Attempting to create vehicle for user ${userId} with DTO: ${JSON.stringify(
        createVehicleDto,
      )}`,
    );

    // ADD DUPLICATE CHECK LOGIC START
    // Check for duplicate name for the same user
    const existingVehicleByName = await this.vehiclesRepository.findOne({
      where: {
        name: createVehicleDto.name,
        user: { id: userId },
      },
    });
    if (existingVehicleByName) {
      this.logger.warn(
        `Vehicle with name "${createVehicleDto.name}" already exists for user ${userId}.`,
      );
      throw new ConflictException(
        `您已拥有名为 "${createVehicleDto.name}" 的车辆。`,
      );
    }

    // Check for duplicate plate_number for the same user, if plate_number is provided and not empty
    if (
      createVehicleDto.plate_number &&
      createVehicleDto.plate_number.trim() !== ''
    ) {
      const existingVehicleByPlate = await this.vehiclesRepository.findOne({
        where: {
          plate_number: createVehicleDto.plate_number,
          user: { id: userId },
        },
      });
      if (existingVehicleByPlate) {
        this.logger.warn(
          `Vehicle with plate number "${createVehicleDto.plate_number}" already exists for user ${userId}.`,
        );
        throw new ConflictException(
          `您已拥有车牌号为 "${createVehicleDto.plate_number}" 的车辆。`,
        );
      }
    }
    // ADD DUPLICATE CHECK LOGIC END

    const newVehicle = this.vehiclesRepository.create({
      ...createVehicleDto,
      user: { id: userId } as User,
    });

    try {
      const savedVehicle = await this.vehiclesRepository.save(newVehicle);
      return savedVehicle;
    } catch (err: unknown) {
      let errorMessage = 'Error creating vehicle';
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
        // PostgreSQL unique violation
        this.logger.warn(
          `Database-level unique constraint violation for user ${userId}, DTO: ${JSON.stringify(createVehicleDto)}`,
        );
        throw new ConflictException('车辆名称或车牌号与现有车辆冲突。');
      }
      throw err;
    }
  }

  async findAll(userId: number): Promise<Vehicle[]> {
    this.logger.log(`Finding all vehicles for user ${userId}`);
    try {
      const vehicles = await this.vehiclesRepository.find({
        where: { user: { id: userId } },
        relations: ['user'],
      });
      this.logger.log(`Found ${vehicles.length} vehicles for user ${userId}`);
      return vehicles;
    } catch (err: unknown) {
      let errorMessage = 'Error finding vehicles';
      let errorStack: string | undefined;

      if (err instanceof Error) {
        errorMessage = err.message;
        errorStack = err.stack;
      } else {
        errorMessage = String(err);
      }
      this.logger.error(
        `[FIND_ALL DB EXCEPTION] UserID: ${userId} - ${errorMessage}`,
        errorStack,
      );
      throw err;
    }
  }

  async findOne(id: number, userId: number): Promise<Vehicle> {
    this.logger.log(`Finding vehicle with id: ${id} for user: ${userId}`);
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!vehicle) {
      this.logger.warn(
        `Vehicle with ID "${id}" not found or not owned by user ${userId}`,
      );
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }
    return vehicle;
  }

  async update(
    id: number,
    updateVehicleDto: UpdateVehicleDto,
    userId: number,
  ): Promise<Vehicle> {
    this.logger.log(
      `Attempting to update vehicle with ID "${id}" for user ${userId}. Data: ${JSON.stringify(
        updateVehicleDto,
      )}`,
    );

    // Preload to ensure the vehicle exists and belongs to the user
    const vehicleToUpdate = await this.vehiclesRepository.preload({
      id: id,
      ...updateVehicleDto,
      manufacturing_date: updateVehicleDto.manufacturing_date
        ? new Date(updateVehicleDto.manufacturing_date)
        : undefined,
    });

    if (!vehicleToUpdate) {
      this.logger.warn(`Vehicle with ID "${id}" not found for update.`);
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }

    this.logger.log(
      `Vehicle data to save (after preload and merge): ${JSON.stringify(vehicleToUpdate)}`,
    );
    try {
      const updatedVehicle =
        await this.vehiclesRepository.save(vehicleToUpdate);
      this.logger.log(
        `Vehicle with ID "${id}" updated successfully: ${JSON.stringify(updatedVehicle)}`,
      );
      return updatedVehicle;
    } catch (err: unknown) {
      let errorMessage = `Error updating vehicle ${id}`;
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
          `Failed to update vehicle. A vehicle with similar properties (e.g., name) might already exist.`,
        );
      }
      throw err;
    }
  }

  async remove(id: number, userId: number): Promise<void> {
    this.logger.log(
      `Attempting to remove vehicle with ID "${id}" for user ${userId}`,
    );
    // First, check if the vehicle exists and belongs to the user
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!vehicle) {
      this.logger.warn(
        `Vehicle with id ${id} not found or not owned by user ${userId} for removal.`,
      );
      throw new NotFoundException(
        `Vehicle with ID "${id}" not found for removal`,
      );
    }
    try {
      const result = await this.vehiclesRepository.delete(id);
      if (result.affected === 0) {
        // This case should ideally be caught by the findOne check above, but as a safeguard:
        this.logger.warn(
          `No vehicle was deleted for ID "${id}", though it was found. This might indicate a race condition or an unexpected issue.`,
        );
        throw new NotFoundException(
          `Vehicle with ID "${id}" could not be deleted. It might have been removed already.`,
        );
      }
      this.logger.log(`Vehicle with ID "${id}" removed successfully.`);
    } catch (err: unknown) {
      let errorMessage = `Error removing vehicle ${id}`;
      let errorStack: string | undefined;

      if (err instanceof Error) {
        errorMessage = err.message;
        errorStack = err.stack;
      } else {
        errorMessage = String(err);
      }
      this.logger.error(`[REMOVE DB EXCEPTION] ${errorMessage}`, errorStack);
      throw err;
    }
  }
}
