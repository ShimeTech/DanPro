import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum SubmittalStatusDto {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  APPROVED_WITH_COMMENTS = 'APPROVED_WITH_COMMENTS',
  REJECTED = 'REJECTED',
  REVISE_AND_RESUBMIT = 'REVISE_AND_RESUBMIT',
  CLOSED = 'CLOSED',
}

export class CreateSubmittalDto {
  @IsNumber()
  projectId!: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  specificationReference?: string;

  @IsOptional()
  @IsEnum(SubmittalStatusDto)
  status?: SubmittalStatusDto;

  @IsOptional()
  @IsString()
  revision?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  reviewerId?: number;

  @IsOptional()
  @IsNumber()
  documentId?: number;
}