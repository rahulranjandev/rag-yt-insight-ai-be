import { IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { BaseDto } from './base.dto';

export class RegisterDto extends BaseDto {
  @IsString()
  @ApiProperty({ example: 'Rahul Ranjan' })
  name: string;
}
