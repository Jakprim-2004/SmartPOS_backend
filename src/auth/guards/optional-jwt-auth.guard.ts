
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    handleRequest(err, user, info) {
        // Even if no token or invalid token, we don't throw error.
        // We simply return user (if found) or null/undefined.
        return user;
    }
}
