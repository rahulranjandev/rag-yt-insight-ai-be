import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video } from '@app/entities/video.entity';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { QueueModule } from '@app/modules/queue/queue.module';
import { AuthModule } from '@app/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Video]),
    forwardRef(() => QueueModule),
    forwardRef(() => AuthModule),
  ],

  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
