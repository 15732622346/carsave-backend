import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SimpleLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('SimpleHTTP');

  use(req: Request, res: Response, next: NextFunction) {
    // 记录请求
    this.logger.log(`收到请求: ${req.method} ${req.originalUrl}`);

    // 继续处理请求
    next();
  }
}
