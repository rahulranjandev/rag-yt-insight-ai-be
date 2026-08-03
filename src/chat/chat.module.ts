import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSession } from '@app/entities/chat-sessions.entity';
import { ChatMessage } from '@app/entities/chat-messages.entity';
import { Video } from '@app/entities/video.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { LangGraphModule } from '@app/modules/langgraph/langgraph.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, ChatMessage, Video]),
    forwardRef(() => LangGraphModule),
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
