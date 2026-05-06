import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Area } from './Area';
import { User } from './User';

@Entity('shift_handover_notes')
@Index(['areaId', 'noteDate'], { unique: true })
export class ShiftHandoverNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  areaId: number;

  @ManyToOne(() => Area, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'areaId' })
  area: Area;

  @Column({ type: 'date', name: 'note_date' })
  noteDate: Date;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'author_user_id' })
  authorUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_user_id' })
  author: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
