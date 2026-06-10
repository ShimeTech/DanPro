import { Test, TestingModule } from '@nestjs/testing';
import { SubmittalsController } from './submittals.controller';

describe('SubmittalsController', () => {
  let controller: SubmittalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmittalsController],
    }).compile();

    controller = module.get<SubmittalsController>(SubmittalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
