import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceComponentsService } from './maintenance-components/maintenance-components.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MaintenanceComponent } from './database/entities/maintenance-component.entity';

describe('MaintenanceComponentsService', () => {
  let service: MaintenanceComponentsService;
  let mockRepository: Repository<MaintenanceComponent>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaintenanceComponentsService],
    }).compile();

    service = module.get<MaintenanceComponentsService>(
      MaintenanceComponentsService,
    );
    mockRepository = module.get<Repository<MaintenanceComponent>>(
      getRepositoryToken(MaintenanceComponent),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(mockRepository).toBeDefined();
  });

  // Add more tests here, e.g., for create, findAll, findOne, update, remove methods
});
