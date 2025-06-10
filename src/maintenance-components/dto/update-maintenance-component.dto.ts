import { PartialType } from '@nestjs/mapped-types';
import { CreateMaintenanceComponentDto } from './create-maintenance-component.dto';

export class UpdateMaintenanceComponentDto extends PartialType(
  CreateMaintenanceComponentDto,
) {}
