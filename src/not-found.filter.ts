import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('NotFoundFilter');

  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const message = exception.message || 'Not Found';

    this.logger.error(`404错误: ${request.method} ${request.url} - ${message}`);
    this.logger.error(
      `请求详情: headers=${JSON.stringify(request.headers)}, query=${JSON.stringify(request.query)}, body=${JSON.stringify(request.body)}`,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: message,
    });
  }
}
