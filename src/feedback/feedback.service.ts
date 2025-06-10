import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../database/entities/feedback.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {}

  async createFeedback(user_id: string, content: string): Promise<Feedback> {
    const feedback = this.feedbackRepository.create({ user_id, content });
    return await this.feedbackRepository.save(feedback);
  }
} 