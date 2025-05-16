import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MaintenanceComponent } from './maintenance-component.entity';
import { MaintenanceRecord } from './maintenance-record.entity';
import { User } from './user.entity';

@Entity('vehicles') // Map to the 'vehicles' table
export class Vehicle {
  @PrimaryGeneratedColumn() // Maps to 'id INT AUTO_INCREMENT PRIMARY KEY'
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false }) // Maps to 'name VARCHAR(255) NOT NULL'
  name: string;

  @Column({ type: 'int', nullable: false }) // Maps to 'mileage INT NOT NULL'
  mileage: number;

  @Column({ type: 'date', nullable: true }) // Maps to 'manufacturing_date DATE NULL'
  manufacturing_date: Date;

  @Column({ type: 'varchar', length: 1024, nullable: true }) // Maps to 'image VARCHAR(1024) NULL'
  image: string;

  @Column({ type: 'varchar', length: 50, nullable: true }) // Maps to 'plate_number VARCHAR(50) NULL'
  plate_number: string;

  @CreateDateColumn() // Maps to 'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
  created_at: Date;

  @UpdateDateColumn() // Maps to 'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  updated_at: Date;

  // Foreign key for User
  @ManyToOne(() => User, (user) => user.vehicles, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Define relationships (will add corresponding @ManyToOne in other entities)
  @OneToMany(() => MaintenanceComponent, (component) => component.vehicle)
  maintenanceComponents: MaintenanceComponent[];

  @OneToMany(() => MaintenanceRecord, (record) => record.vehicle)
  maintenanceRecords: MaintenanceRecord[];
}
