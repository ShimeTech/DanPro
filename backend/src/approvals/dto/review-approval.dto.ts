import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApprovalStatusDto } from './create-approval.dto';

export class ReviewApprovalDto {
  @IsEnum(ApprovalStatusDto)
  status!: ApprovalStatusDto;

  @IsOptional()
  @IsString()
  comments?: string;
}