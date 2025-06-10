import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// 扩展Request接口以包含startTime属性
interface RequestWithTime extends Request {
  startTime?: number;
}

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { method, originalUrl, body, query, params, headers } = req;
    const requestWithTime = req as RequestWithTime;

    this.logger.log(`收到请求: ${method} ${originalUrl}`);
    this.logger.log(`请求头: ${JSON.stringify(headers)}`);
    this.logger.log(
      `请求参数: query=${JSON.stringify(query)}, params=${JSON.stringify(params)}, body=${JSON.stringify(body)}`,
    );

    // 记录响应
    const originalSend = res.send;
    res.send = (responseBody: any): Response => {
      const responseTime =
        new Date().getTime() - (requestWithTime.startTime || 0);
      const logContext = `${method} ${originalUrl} ${res.statusCode} ${responseTime}ms`;

      try {
        if (res.statusCode >= 400) {
          this.logger.error(`错误响应: ${String(responseBody)}`, logContext);
          this.logger.error(
            `请求详情: method=${method}, url=${originalUrl}, headers=${JSON.stringify(headers)}, body=${JSON.stringify(body)}`,
          );
        } else {
          this.logger.log(`响应: ${res.statusCode}`, logContext);
        }
      } catch (error) {
        this.logger.error(
          '日志记录期间发生错误',
          error instanceof Error ? error.stack : String(error),
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return originalSend.call(res, responseBody);
    };

    // 添加请求开始时间
    requestWithTime.startTime = new Date().getTime();

    next();
  }
}
