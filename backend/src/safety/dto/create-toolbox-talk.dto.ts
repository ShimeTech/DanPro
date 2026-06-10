import { IsArray, IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateToolboxTalkDto {
  @IsNumber()
  projectId!: number;

  @IsString()
  topic!: string;

  @IsDateString()
  talkDate!: string;

  @IsOptional()
  @IsArray()
  attendees?: any[];

  @IsOptional()
  @IsNumber()
  leaderId?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}