import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { VideosService } from './videos.service';
import { AnalyzeVideoDto } from './dto/analyze-video.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { WebJwtAuthGuard } from '../auth/guards/web-jwt-auth.guard';
import { AuthUser } from '@app/common/decorators/user.decorator';

@ApiTags('videos')
@ApiBearerAuth()
@UseGuards(WebJwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('videos')
export class VideosController {
  private readonly logger = new Logger(VideosController.name);

  constructor(private readonly videosService: VideosService) {}

  @ApiOperation({ summary: 'Analyze videos from YouTube and Instagram' })
  @ApiBody({ type: AnalyzeVideoDto })
  @Post('analyze')
  async analyzeVideos(
    @Body() createVideoDto: AnalyzeVideoDto,
    @Req() req: ContextualRequest,
  ) {
    if (req?.user?.id) {
      return this.videosService.analyzeVideos(createVideoDto, req.user);
    } else {
      throw new BadRequestException('Failed to create video analysis job');
    }
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Get video analysis job status' })
  @ApiParam({
    name: 'jobId',
    description: 'Analysis job or video ID.',
    example: '1',
  })
  async getJobStatus(
    @Param('jobId') jobId: string,
    @AuthUser() authUser: string,
  ) {
    return this.videosService.getJobStatus(jobId, authUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all analyzed videos for authenticated user' })
  async findAllVideosForUser(@AuthUser() userId: string) {
    return this.videosService.findAllVideosForUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get analyzed video by ID' })
  @ApiParam({
    name: 'id',
    description: 'Video ID.',
    example: 'd2b21130-1213-4d64-a9fe-f6e28f3a4929',
  })
  async getVideo(@Param('id') id: string, @AuthUser() authUser: string) {
    return this.videosService.getVideo(id, authUser);
  }
}
