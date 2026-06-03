import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Relation,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
  BaseEntity,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { TranscriptChunk } from './transcript-chunks.entity';
import { ChatSession } from './chat-sessions.entity';

@Entity('videos')
@Index('idx_videos_user', ['userId'])
export class Video extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: Relation<User> | null;

  @Column('varchar', { length: 255 })
  youtubeId: string;

  @Column('text')
  title: string;

  @Column('text')
  channel: string;

  @Column('text')
  description: string;

  @Column({ type: 'int', nullable: true })
  duration?: number | null;

  @Column('text')
  thumbnail: string;

  @Column('text', { nullable: true })
  transcriptStatus?: string | null;

  @OneToMany(() => TranscriptChunk, (chunk) => chunk.video)
  chunks: Relation<TranscriptChunk[]>;

  @OneToMany(() => ChatSession, (session) => session.video)
  chatSessions: Relation<ChatSession[]>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
