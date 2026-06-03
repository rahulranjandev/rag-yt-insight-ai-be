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
import { Video } from './video.entity';

@Entity('transcript_chunks')
@Index('idx_chunks_video', ['videoId', 'chunkIndex'])
export class TranscriptChunk extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  videoId: string;

  @ManyToOne(() => Video, (video) => video.id, { onDelete: 'CASCADE' })
  @JoinColumn()
  video: Relation<Video | null>;

  @Column('integer')
  chunkIndex: number;

  @Column('text')
  content: string;

  @Column('float')
  startTime: number; // in seconds

  @Column('float')
  endTime: number; // in seconds

  @Index('transcript_chunks_embedding_hnsw_idx', { synchronize: false })
  @Column({
    type: 'vector',
    length: 1536,
  })
  embedding: number[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
