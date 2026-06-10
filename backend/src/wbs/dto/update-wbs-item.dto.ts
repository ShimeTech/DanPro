import { PartialType } from '@nestjs/mapped-types';
import { CreateWbsItemDto } from './create-wbs-item.dto';

export class UpdateWbsItemDto extends PartialType(CreateWbsItemDto) {}