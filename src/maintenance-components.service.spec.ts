import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceComponentsService } from './maintenance-components.service';

describe('MaintenanceComponentsService', () => {
  let service: MaintenanceComponentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaintenanceComponentsService],
    }).compile();

    service = module.get<MaintenanceComponentsService>(MaintenanceComponentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
