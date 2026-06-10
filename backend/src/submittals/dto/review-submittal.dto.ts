import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ReviewSubmittalStatusDto {
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  APPROVED_WITH_COMMENTS = 'APPROVED_WITH_COMMENTS',
  REJECTED = 'REJECTED',
  REVISE_AND_RESUBMIT = 'REVISE_AND_RESUBMIT',
}

export class ReviewSubmittalDto {
  @IsEnum(ReviewSubmittalStatusDto)
  status!: ReviewSubmittalStatusDto;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}