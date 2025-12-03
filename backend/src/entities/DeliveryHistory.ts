import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { Medication } from './Medication';
import { MedicationRequest } from './MedicationRequest';

@Entity('delivery_history')
export class DeliveryHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  deliveryId: string;

  @Column()
  requestId: number;

  @ManyToOne(() => MedicationRequest)
  @JoinColumn({ name: 'requestId' })
  request: MedicationRequest;

  @Column()
  medicationId: number;

  @ManyToOne(() => Medication)
  @JoinColumn({ name: 'medicationId' })
  medication: Medication;

  @Column({ length: 100 })
  dosage: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column()
  requestedById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requestedById' })
  requestedBy: User;

  @Column()
  deliveredById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'deliveredById' })
  deliveredBy: User;

  @Column({ type: 'json' })
  patients: any;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  deliveredAt: Date;
}

