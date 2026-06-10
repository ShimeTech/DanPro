import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RfiStatusDto } from './create-rfi.dto';

export class RespondRfiDto {
  @IsString()
  response!: string;

  @IsOptional()
  @IsEnum(RfiStatusDto)
  status?: RfiStatusDto;
}