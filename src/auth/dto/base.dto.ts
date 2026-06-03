import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class BaseDto {
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  @ApiProperty({ example: 'abc@gmail.com' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'password' })
  password: string;
}
