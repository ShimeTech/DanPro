import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

enum NotificationTypeDto {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  APPROVAL = 'APPROVAL',
  DEADLINE = 'DEADLINE',
}

export class CreateNotificationDto {
  @Type(() => Number)
  @IsInt()
  userId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number | null;

  @IsOptional()
  @IsEnum(NotificationTypeDto)
  type?: NotificationTypeDto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
