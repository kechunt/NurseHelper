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
import { encryptedRequiredTextTransformer } from '../utils/typeorm-encrypted.transformers';

@Entity('shift_handover_notes')
@Index(['areaId', 'noteDate', 'shiftSlot'], { unique: true })
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

  /** Alineado con `ShiftType`: morning | afternoon | night */
  @Column({ type: 'varchar', length: 16, name: 'shift_slot' })
  shiftSlot: string;

  @Column({ type: 'text', transformer: encryptedRequiredTextTransformer })
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
