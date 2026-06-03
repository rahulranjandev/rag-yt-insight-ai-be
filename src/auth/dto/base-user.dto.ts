import { IsString, IsEmail, Length, IsOptional } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class BaseUserDto {
  @IsString()
  @Length(14, 18)
  @ApiProperty({ example: '1' })
  verifyToken: string;

  @IsString()
  @ApiProperty({ example: 'Rahul Ranjan', required: false })
  name: string;

  @IsString()
  @IsEmail()
  @ApiProperty({ example: 'rahul.ranjan@example.com', required: false })
  email: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'https://example.com/photo.jpg', required: false })
  profileImage?: string;
}
