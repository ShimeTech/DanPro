import { IsEnum, IsNumber, IsOptional } from 'class-validator';

export enum DependencyTypeDto {
  FINISH_TO_START = 'FINISH_TO_START',
  START_TO_START = 'START_TO_START',
  FINISH_TO_FINISH = 'FINISH_TO_FINISH',
  START_TO_FINISH = 'START_TO_FINISH',
}

export class CreateTaskDependencyDto {
  @IsNumber()
  predecessorId!: number;

  @IsNumber()
  successorId!: number;

  @IsOptional()
  @IsEnum(DependencyTypeDto)
  type?: DependencyTypeDto;

  @IsOptional()
  @IsNumber()
  lagDays?: number;
}