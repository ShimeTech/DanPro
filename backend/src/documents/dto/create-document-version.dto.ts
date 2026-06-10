import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { DocumentStatusDto } from './create-document.dto';

export class CreateDocumentVersionDto {
  @IsNumber()
  documentId!: number;

  @IsString()
  revision!: string;

  @IsOptional()
  @IsEnum(DocumentStatusDto)
  status?: DocumentStatusDto;

  @IsString()
  fileName!: string;

  @IsString()
  filePath!: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}