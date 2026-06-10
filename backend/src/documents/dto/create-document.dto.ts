import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum DocumentTypeDto {
  DRAWING = 'DRAWING',
  RFI = 'RFI',
  SUBMITTAL = 'SUBMITTAL',
  METHOD_STATEMENT = 'METHOD_STATEMENT',
  INSPECTION_REQUEST = 'INSPECTION_REQUEST',
  CONTRACT = 'CONTRACT',
  REPORT = 'REPORT',
  OTHER = 'OTHER',
}

export enum DocumentStatusDto {
  WIP = 'WIP',
  SHARED = 'SHARED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  REJECTED = 'REJECTED',
}

export class CreateDocumentDto {
  @IsNumber()
  projectId!: number;

  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsEnum(DocumentTypeDto)
  type!: DocumentTypeDto;

  @IsOptional()
  @IsString()
  discipline?: string;

  @IsOptional()
  @IsString()
  originator?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsEnum(DocumentStatusDto)
  status?: DocumentStatusDto;

  @IsOptional()
  @IsString()
  currentRevision?: string;

  @IsOptional()
  @IsString()
  description?: string;
}