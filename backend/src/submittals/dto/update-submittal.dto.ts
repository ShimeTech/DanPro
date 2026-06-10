import { PartialType } from '@nestjs/mapped-types';
import { CreateSubmittalDto } from './create-submittal.dto';

export class UpdateSubmittalDto extends PartialType(CreateSubmittalDto) {}