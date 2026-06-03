import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  ManyToOne,
  JoinColumn,
  BaseEntity,
  Relation,
  Index,
  OneToMany,
} from 'typeorm';

import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { Video } from './video.entity';
import { ChatSession } from './chat-sessions.entity';

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Index('users_email_idx', { unique: true })
  @Column({ type: 'varchar', length: 50, nullable: true })
  email: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  profileImage!: string | null;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  password: string | null;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  refresh_token: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @OneToMany(() => Video, (video) => video.user)
  videos: Relation<Video[]>;

  @OneToMany(() => ChatSession, (session) => session.user)
  chatSessions: Relation<ChatSession[]>;

  @ManyToOne(() => User)
  @JoinColumn()
  createdBy: Relation<User | null>;

  @ManyToOne(() => User)
  @JoinColumn()
  updatedBy: Relation<User | null>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      const saltRounds = 10;
      const salt = await bcrypt.genSalt(saltRounds);
      const hashPassword = await bcrypt.hash(this.password, salt);

      this.password = hashPassword;
    }
  }

  async comparePassword(password: string) {
    if (!this.password) {
      throw new Error('select password');
    }

    return await bcrypt.compare(password, this.password);
  }

  async hashRefreshToken(token: string | Buffer) {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashToken = await bcrypt.hash(token, salt);
    return hashToken;
  }

  async verifyRefreshToken(hash: string, refresh_token: string) {
    return await bcrypt.compare(hash, refresh_token);
  }
}
