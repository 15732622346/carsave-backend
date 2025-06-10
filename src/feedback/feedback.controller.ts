import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFeedback(
    @Body('user_id') user_id: string,
    @Body('content') content: string,
  ) {
    await this.feedbackService.createFeedback(user_id, content);
    return {
      status: 201,
      message: '反馈提交成功',
    };
  }
} 