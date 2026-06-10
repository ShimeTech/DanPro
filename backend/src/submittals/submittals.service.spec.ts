import { Test, TestingModule } from '@nestjs/testing';
import { SubmittalsService } from './submittals.service';

describe('SubmittalsService', () => {
  let service: SubmittalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubmittalsService],
    }).compile();

    service = module.get<SubmittalsService>(SubmittalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
