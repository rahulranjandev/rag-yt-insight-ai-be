import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BaseEntity,
  Relation,
  Index,
} from 'typeorm';
import { ChatSession } from './chat-sessions.entity';

@Entity('chat_messages')
@Index('idx_chat_message_session', ['sessionId'])
export class ChatMessage extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @ManyToOne(() => ChatSession, (session) => session.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  session: Relation<ChatSession | null>;

  @Column()
  role: string;

  @Column('text')
  content: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
