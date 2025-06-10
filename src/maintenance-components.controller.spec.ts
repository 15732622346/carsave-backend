import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceComponentsController } from './maintenance-components.controller';

describe('MaintenanceComponentsController', () => {
  let controller: MaintenanceComponentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceComponentsController],
    }).compile();

    controller = module.get<MaintenanceComponentsController>(
      MaintenanceComponentsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
