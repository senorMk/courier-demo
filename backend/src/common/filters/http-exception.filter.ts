import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // If it's an HttpException, reuse its status; otherwise 500
    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? (exception as HttpException).getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Normalize message from HttpException.getResponse() or generic Error
    let message: any = 'Internal server error';
    let errorName: string | undefined = undefined;
    if (isHttp) {
      const res = (exception as HttpException).getResponse();
      if (typeof res === 'string') message = res;
      else if (res && typeof res === 'object') {
        message = (res as any).message || res;
      }
      errorName = (exception as any).name || 'HttpException';
    } else {
      message = exception?.message || message;
      errorName = exception?.name || 'Error';
    }

    const body: any = {
      statusCode: status,
      message,
      error: errorName,
      timestamp: new Date().toISOString(),
      path: request?.url,
    };

    // Only include stack traces for 500s and when not in production
    if (status === 500 && process.env.NODE_ENV !== 'production') {
      body.stack = exception?.stack;
    }

    response.status(status).json(body);
  }
}

