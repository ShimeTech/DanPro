import { PartialType } from '@nestjs/mapped-types';
import { CreateToolboxTalkDto } from './create-toolbox-talk.dto';

export class UpdateToolboxTalkDto extends PartialType(CreateToolboxTalkDto) {}