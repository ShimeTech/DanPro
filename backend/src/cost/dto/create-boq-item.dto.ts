import { IsNumber, IsString } from 'class-validator';

export class CreateBoqItemDto {
  @IsNumber()
  projectId!: number;

  @IsString()
  code!: string;

  @IsString()
  description!: string;

  @IsString()
  unit!: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  unitRate!: number;
}