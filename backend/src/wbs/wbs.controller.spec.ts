import { Test, TestingModule } from '@nestjs/testing';
import { WbsController } from './wbs.controller';

describe('WbsController', () => {
  let controller: WbsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WbsController],
    }).compile();

    controller = module.get<WbsController>(WbsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
