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
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { ChatMessage } from './chat-messages.entity';
import { Video } from './video.entity';

@Entity('chat_sessions')
@Index('idx_chat_session_user', ['userId'])
export class ChatSession extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.chatSessions)
  @JoinColumn()
  user: Relation<User | null>;

  @Column()
  videoId: string;

  @ManyToOne(() => Video, { onDelete: 'SET NULL' })
  @JoinColumn()
  video: Relation<Video | null>;

  @Column()
  title: string;

  @OneToMany(() => ChatMessage, (message) => message.session)
  messages: Relation<ChatMessage[]>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
