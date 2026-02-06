
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private supabaseService: SupabaseService,
        private jwtService: JwtService,
    ) { }

    async validateUser(username: string, pass: string): Promise<any> {
        const { data: user, error } = await this.supabaseService.getClient()
            .from('admins')
            .select('*, shop_name')
            .eq('username', username)
            .single();

        if (error || !user) {
            return null;
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(pass, user.password_hash);
        if (isMatch) {
            const { password_hash, ...result } = user;
            return result;
        }
        return null;
    }

    async login(loginDto: LoginDto) {
        const user = await this.validateUser(loginDto.username, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = {
            username: user.username,
            sub: user.id,
            role: user.role || 'admin',
            shopName: user.shop_name,
            name: user.name,
            shopId: user.shop_id
        };
        const accessToken = this.jwtService.sign(payload);
        return {
            access_token: accessToken,
            user: {
                id: user.id,
                username: user.username,
                role: user.role || 'admin',
                shopName: user.shop_name,
                name: user.name,
                shopId: user.shop_id // Add shopId to response
            },
            message: 'Login successful',
        };
    }

    // Method to manually create admin for seeding (dev only)
    async register(username: string, pass: string, shopName?: string) {
        const hash = await bcrypt.hash(pass, 10);
        const shopId = `SHOP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

        const { data, error } = await this.supabaseService.getClient()
            .from('admins')
            .insert({
                username,
                password_hash: hash,
                shop_name: shopName || 'My Shop', // Default if not provided
                shop_id: shopId, // Explicitly set unique shopId
                role: 'admin' // Ensure role is admin
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }
}
