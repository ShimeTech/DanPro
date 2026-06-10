import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum RfiStatusDto {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  ANSWERED = 'ANSWERED',
  CLOSED = 'CLOSED',
  REJECTED = 'REJECTED',
}

export enum RfiPriorityDto {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateRfiDto {
  @IsNumber()
  projectId!: number;

  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsString()
  question!: string;

  @IsOptional()
  @IsEnum(RfiStatusDto)
  status?: RfiStatusDto;

  @IsOptional()
  @IsEnum(RfiPriorityDto)
  priority?: RfiPriorityDto;

  @IsOptional()
  @IsNumber()
  assignedToId?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}