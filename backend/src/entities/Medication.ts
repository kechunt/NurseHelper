import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MedicationStatus {
  AVAILABLE = 'available',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  EXPIRED = 'expired',
}

@Entity('medications')
export class Medication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 100 })
  dosage: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', default: 50 })
  minStock: number;

  @Column({ length: 50, nullable: true })
  location: string;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({
    type: 'enum',
    enum: MedicationStatus,
    default: MedicationStatus.AVAILABLE,
  })
  status: MedicationStatus;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

