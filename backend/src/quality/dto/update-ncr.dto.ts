import { PartialType } from '@nestjs/mapped-types';
import { CreateNcrDto } from './create-ncr.dto';

export class UpdateNcrDto extends PartialType(CreateNcrDto) {}