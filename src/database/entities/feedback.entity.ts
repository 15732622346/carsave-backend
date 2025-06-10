import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, comment: '用户注册邮箱' })
  user_id: string;

  @Column({ type: 'text', comment: '反馈内容' })
  content: string;

  @CreateDateColumn({ type: 'datetime', comment: '提交时间' })
  created_at: Date;
} 