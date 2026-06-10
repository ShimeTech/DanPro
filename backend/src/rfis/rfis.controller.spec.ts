import { Test, TestingModule } from '@nestjs/testing';
import { RfisController } from './rfis.controller';

describe('RfisController', () => {
  let controller: RfisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RfisController],
    }).compile();

    controller = module.get<RfisController>(RfisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
