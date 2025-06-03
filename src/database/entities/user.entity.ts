import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';

@Entity('users') // 'users' 是数据库中的表名
export class User {
  @PrimaryGeneratedColumn() // 匹配数据库中的 INT AUTO_INCREMENT
  id: number;

  @Column({ unique: true, nullable: false }) // 匹配数据库中的 openid VARCHAR(255) NOT NULL
  openid: string;

  @Column({ nullable: true })
  unionid?: string;

  @Column({ name: 'nickname', nullable: true }) // 显式映射到 nickname 列 (虽然默认也会)
  nickName?: string; // 实体属性名可以保持驼峰

  @Column({ name: 'avatar_url', nullable: true }) // 显式映射到 avatar_url 列
  avatarUrl?: string; // 实体属性名可以保持驼峰

  // gender, city, province, country 在您的 SQL 中没有，如果 User 实体需要可以保留，否则移除
  // @Column({ nullable: true })
  // gender?: number;

  // @Column({ nullable: true })
  // city?: string;

  // @Column({ nullable: true })
  // province?: string;

  // @Column({ nullable: true })
  // country?: string;

  // 根据您的需求可以添加更多字段，例如 phone, email, role等
  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  resetToken?: string;

  @Column({ nullable: true })
  resetTokenExpiry?: Date;

  @Column({ nullable: true })
  resetCode?: string;

  @Column({ nullable: true, type: 'datetime' })
  resetCodeExpiry?: Date;

  @CreateDateColumn({ name: 'created_at' }) // 匹配数据库列名
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' }) // 匹配数据库列名
  updatedAt: Date;

  // Define relationship with Vehicle
  @OneToMany(() => Vehicle, (vehicle) => vehicle.user)
  vehicles: Vehicle[];
}
