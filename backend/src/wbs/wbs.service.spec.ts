import { Test, TestingModule } from '@nestjs/testing';
import { WbsService } from './wbs.service';

describe('WbsService', () => {
  let service: WbsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WbsService],
    }).compile();

    service = module.get<WbsService>(WbsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
