
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.getResponse()
                : { message: 'Internal server error' };

        // Normalize message structure (sometimes it's string, sometimes object)
        const errorResponse = typeof message === 'string'
            ? { message }
            : (message as object);

        response
            .status(status)
            .json({
                statusCode: status,
                ...errorResponse,
                path: request.url,
                timestamp: new Date().toISOString(),
            });
    }
}
