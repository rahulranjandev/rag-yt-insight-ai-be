import { IsOptional, IsBoolean } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

import { BaseDto } from './base.dto';

export class LoginDto extends BaseDto {
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ example: true })
  rememberMe?: boolean;
}
