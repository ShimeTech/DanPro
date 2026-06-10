import { PartialType } from '@nestjs/mapped-types';
import { CreateBaselineDto } from './create-baseline.dto';

export class UpdateBaselineDto extends PartialType(CreateBaselineDto) {}