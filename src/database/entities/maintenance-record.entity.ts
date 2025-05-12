import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { MaintenanceComponent } from './maintenance-component.entity';
import { User } from '../../users/user.entity';

@Entity('maintenance_records') // Map to the 'maintenance_records' table
export class MaintenanceRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: false }) // Corresponds to vehicle_id INT NOT NULL
  vehicle_id: number;

  @Column({ type: 'int', nullable: false }) // Corresponds to component_id INT NOT NULL
  component_id: number;

  @Column({ type: 'date', nullable: false }) // Maps to maintenance_date DATE NOT NULL
  maintenance_date: Date;

  @Column({ type: 'double', nullable: true })
  mileage_at_maintenance: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int', nullable: false })
  user_id: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Define relationships
  @ManyToOne(() => Vehicle, (vehicle) => vehicle.maintenanceRecords, {
    onDelete: 'CASCADE', // Match the FOREIGN KEY constraint
    nullable: false,
  })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @ManyToOne(
    () => MaintenanceComponent,
    (component) => component.maintenanceRecords,
    {
      onDelete: 'CASCADE', // Match the FOREIGN KEY constraint
      nullable: false,
    },
  )
  @JoinColumn({ name: 'component_id' })
  maintenanceComponent: MaintenanceComponent; // Changed name to avoid conflict with import

  @ManyToOne(() => User, user => user.maintenance_records, { onDelete: 'CASCADE', onUpdate: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;
} 