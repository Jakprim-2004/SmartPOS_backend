
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: any) => {
                    const token = request?.cookies?.access_token;
                    if (!token) console.log('JwtStrategy: No access_token cookie found in request to', request.url);
                    return token;
                },
                ExtractJwt.fromAuthHeaderAsBearerToken(), // Fallback
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'secretKey',
        });
    }

    async validate(payload: any) {
        return {
            userId: payload.sub,
            username: payload.username,
            role: payload.role,
            shopName: payload.shopName,
            shopId: payload.shopId
        };
    }
}
