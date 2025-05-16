import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { MaintenanceRecord } from './maintenance-record.entity';

@Entity('maintenance_components') // Map to the 'maintenance_components' table
export class MaintenanceComponent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'int', nullable: false }) // Corresponds to vehicle_id INT NOT NULL
  vehicle_id: number;

  @Column({ type: 'enum', enum: ['mileage', 'date'], nullable: false }) // Maps to ENUM('mileage', 'date') NOT NULL
  maintenance_type: 'mileage' | 'date';

  @Column({ type: 'double', nullable: false })
  maintenance_value: number;

  @Column({ type: 'varchar', length: 20, nullable: false })
  unit: string;

  @Column({ type: 'double', nullable: true })
  target_maintenance_mileage: number | null;

  @Column({ type: 'date', nullable: true })
  target_maintenance_date: Date | null;

  @Column({ type: 'date', nullable: true })
  last_maintenance_date: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Define relationships
  @ManyToOne(() => Vehicle, (vehicle) => vehicle.maintenanceComponents, {
    onDelete: 'CASCADE', // Match the FOREIGN KEY constraint
    nullable: false,
  })
  @JoinColumn({ name: 'vehicle_id' }) // Specify the foreign key column name
  vehicle: Vehicle;

  @OneToMany(() => MaintenanceRecord, (record) => record.maintenanceComponent)
  maintenanceRecords: MaintenanceRecord[];
}
