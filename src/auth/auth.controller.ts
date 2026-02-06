
import { Controller, Post, Body, UseGuards, Request, Get, HttpCode, HttpStatus, Res, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
        const result = await this.authService.login(loginDto);

        const isProduction = process.env.NODE_ENV === 'production' || result.access_token.length > 0; // Simple check

        // Set HttpOnly Cookie
        response.cookie('access_token', result.access_token, {
            httpOnly: true,
            secure: true, // Must be true for SameSite: 'none'
            sameSite: 'none', // Required for cross-site cookies
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Return access_token so frontend can use it if cookies fail
        return {
            access_token: result.access_token,
            user: result.user,
            message: 'Login successful'
        };
    }

    @Post('logout')
    async logout(@Res({ passthrough: true }) response: Response) {
        // Clear specific path cookie
        response.clearCookie('access_token', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
        });
        // Clear potential default path cookie (legacy)
        response.clearCookie('access_token');

        return { message: 'Logged out successfully' };
    }


    @Post('register')
    async register(@Body() body: RegisterDto) {
        try {
            return await this.authService.register(body.username, body.password, body.shopName);
        } catch (error: any) {
            console.error('Register Error:', error);
            if (error.code === '23505' || error.message?.includes('unique constraint')) {
                throw new HttpException('Registration failed. Username already exists.', HttpStatus.CONFLICT);
            }
            throw new HttpException(error.message || 'Registration failed', HttpStatus.BAD_REQUEST);
        }
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req) {
        return req.user;
    }
}
