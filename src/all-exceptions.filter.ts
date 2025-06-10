import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseStructure {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let messageContent: string;
    let stackTrace: string | undefined;

    if (exception instanceof HttpException) {
      const httpExResponse = exception.getResponse();
      if (typeof httpExResponse === 'string') {
        messageContent = httpExResponse;
      } else if (
        httpExResponse &&
        typeof httpExResponse === 'object' &&
        'message' in httpExResponse
      ) {
        // Handles { message: '...' } or { message: ['...', '...'] }
        // Explicitly type payload to avoid implicit any if httpExResponse is complex
        const payload = httpExResponse as {
          message: string | string[];
          [key: string]: any;
        };
        messageContent = Array.isArray(payload.message)
          ? payload.message.join(', ')
          : String(payload.message);
      } else if (exception.message) {
        // Fallback for HttpException if getResponse() is not standard but message property exists
        messageContent = String(exception.message);
      } else {
        messageContent = 'Http Exception with no specific message';
      }
    } else if (exception instanceof Error) {
      messageContent = exception.message;
    } else {
      messageContent = 'Internal server error';
    }

    if (exception instanceof Error) {
      stackTrace = exception.stack;
    }

    const errorResponse: ErrorResponseStructure = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: messageContent,
    };

    this.logger.error(
      `${request.method} ${request.url} ${status} - ${messageContent}`,
      stackTrace ?? 'No stack trace',
      'ExceptionFilter',
    );

    // 记录请求详情
    this.logger.error(
      `请求详情: ${JSON.stringify({
        headers: request.headers,
        query: request.query,
        params: request.params,
        body: request.body as unknown,
      })}`,
    );

    response.status(status).json(errorResponse);
  }
}
