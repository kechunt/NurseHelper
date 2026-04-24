import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Medication } from './Medication';
import { User } from './User';
import { MedicationRequest } from './MedicationRequest';

export enum InventoryMovementType {
  ENTRY = 'entry',
  EXIT = 'exit',
  ADJUSTMENT = 'adjustment',
  DELIVERY = 'delivery',
}

@Entity('medication_inventory_movements')
@Index(['medicationId', 'createdAt'])
export class MedicationInventoryMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  medicationId: number;

  @ManyToOne(() => Medication, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'medicationId' })
  medication: Medication;

  @Column({
    type: 'enum',
    enum: InventoryMovementType,
  })
  movementType: InventoryMovementType;

  /** Positivo = entrada neta; negativo = salida neta (incl. entregas). */
  @Column({ type: 'int' })
  quantityDelta: number;

  @Column({ type: 'int' })
  stockBefore: number;

  @Column({ type: 'int' })
  stockAfter: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ nullable: true })
  performedById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'performedById' })
  performedBy: User | null;

  @Column({ nullable: true })
  medicationRequestId: number | null;

  @ManyToOne(() => MedicationRequest, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'medicationRequestId' })
  medicationRequest: MedicationRequest | null;

  @CreateDateColumn()
  createdAt: Date;
}
