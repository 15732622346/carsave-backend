import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Vehicle } from '../database/entities/vehicle.entity'; 
import { MaintenanceComponent } from '../database/entities/maintenance-component.entity'; 
import { MaintenanceRecord } from '../database/entities/maintenance-record.entity'; 

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  openid: string;

  @Column({ nullable: true })
  unionid?: string;

  @Column({ nullable: true })
  nickname?: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  avatar_url?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Vehicle, vehicle => vehicle.user)
  vehicles: Vehicle[];

  @OneToMany(() => MaintenanceComponent, component => component.user)
  maintenance_components: MaintenanceComponent[];

  @OneToMany(() => MaintenanceRecord, record => record.user)
  maintenance_records: MaintenanceRecord[];
} 