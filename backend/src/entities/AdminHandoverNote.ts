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
import { User } from './User';

/** Nota compartida entre administradoras / supervisoras (sin área), por fecha y franja de turno. */
@Entity('admin_handover_notes')
@Index(['noteDate', 'shiftSlot'], { unique: true })
export class AdminHandoverNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', name: 'note_date' })
  noteDate: Date;

  /** Mismo criterio que `ShiftType`: morning | afternoon | night */
  @Column({ type: 'varchar', length: 16, name: 'shift_slot' })
  shiftSlot: string;

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
