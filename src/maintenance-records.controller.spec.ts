import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceRecordsController } from './maintenance-records.controller';

describe('MaintenanceRecordsController', () => {
  let controller: MaintenanceRecordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceRecordsController],
    }).compile();

    controller = module.get<MaintenanceRecordsController>(
      MaintenanceRecordsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
