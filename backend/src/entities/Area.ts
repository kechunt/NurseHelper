import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Bed } from './Bed';
import { User } from './User';

@Entity('areas')
@Index(['isActive'])
@Index(['name'])
export class Area {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Bed, (bed) => bed.area, { cascade: false })
  beds: Bed[];

  @OneToMany(() => User, (user) => user.assignedArea)
  assignedUsers: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

