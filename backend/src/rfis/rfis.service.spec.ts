import { Test, TestingModule } from '@nestjs/testing';
import { RfisService } from './rfis.service';

describe('RfisService', () => {
  let service: RfisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RfisService],
    }).compile();

    service = module.get<RfisService>(RfisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
