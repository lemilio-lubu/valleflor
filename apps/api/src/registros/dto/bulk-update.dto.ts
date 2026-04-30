import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class BulkUpdateItemDto {
  @IsUUID()
  id: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cajas: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  divisorTallos?: number;
}

export class BulkUpdateDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  updates: BulkUpdateItemDto[];
}
