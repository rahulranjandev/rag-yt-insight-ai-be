import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LangGraphService } from './langgraph.service';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { ChatMessage } from '@app/entities/chat-messages.entity';
import { ChatModule } from '@app/chat/chat.module';
import { VideosModule } from '@app/videos/videos.module';

@Module({
  imports: [
    RetrievalModule,
    TypeOrmModule.forFeature([ChatMessage]),
    forwardRef(() => ChatModule),
    VideosModule,
  ],
  providers: [LangGraphService],
  exports: [LangGraphService],
})
export class LangGraphModule {}
