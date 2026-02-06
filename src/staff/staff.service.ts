import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import * as bcrypt from 'bcrypt';
import { CreateStaffDto, UpdateStaffDto } from '../auth/dto/staff.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class StaffService {
    constructor(private readonly supabaseService: SupabaseService) { }

    async findPaginated(paginationDto: PaginationDto, shopId: string) {
        const { limit = 10, offset = 0 } = paginationDto;
        const from = offset;
        const to = offset + limit - 1;

        const { data, error, count } = await this.supabaseService.getClient()
            .from('admins')
            .select('id, username, role, shop_name, created_at, name, shop_id', { count: 'exact' })
            .eq('shop_id', shopId)
            .neq('role', 'admin')
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error fetching staff:', error);
            return { data: [], total: 0, limit, offset, nextPage: null };
        }

        const total = count || 0;
        const hasNext = offset + limit < total;

        return {
            data: data || [],
            total,
            limit,
            offset,
            nextPage: hasNext ? offset + limit : null
        };
    }

    async findAll(shopId: string) {
        const { data, error } = await this.supabaseService.getClient()
            .from('admins')
            .select('id, username, role, shop_name, created_at, name, shop_id')
            .eq('shop_id', shopId)
            // .eq('role', 'staff') // Optional: If we strictly want only staff role.
            .neq('role', 'admin'); // Don't list other admins? Or maybe query param? Assuming list staff.

        // Usually we want to list only 'staff' created by this shop.

        if (error) throw error;
        return data;
    }

    async create(adminId: number, dto: CreateStaffDto, shopId: string) {
        const hash = await bcrypt.hash(dto.password, 10);

        const { data, error } = await this.supabaseService.getClient()
            .from('admins')
            .insert({
                username: dto.username,
                password_hash: hash,
                name: dto.name,
                role: 'staff',
                admin_id: adminId,
                shop_id: shopId, // Store shopId
                shop_name: dto.shop_name || 'My Shop' // Legacy or display
            })
            .select('id, username, role, shop_name, name')
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async update(adminId: number, staffId: number, dto: UpdateStaffDto, shopId: string) {
        // Verify this staff belongs to this shop
        const { data: staff } = await this.supabaseService.getClient()
            .from('admins')
            .select('shop_id')
            .eq('id', staffId)
            .single();

        if (!staff || staff.shop_id !== shopId) {
            throw new ForbiddenException('You do not have permission to update this staff member');
        }

        const updateData: any = {};
        if (dto.name) updateData.name = dto.name;
        if (dto.shop_name) updateData.shop_name = dto.shop_name;
        if (dto.password) {
            updateData.password_hash = await bcrypt.hash(dto.password, 10);
        }

        const { data, error } = await this.supabaseService.getClient()
            .from('admins')
            .update(updateData)
            .eq('id', staffId)
            .select('id, username, role, shop_name, name')
            .single();

        if (error) throw error;
        return data;
    }

    async delete(adminId: number, staffId: number, shopId: string) {
        const { data: staff } = await this.supabaseService.getClient()
            .from('admins')
            .select('shop_id')
            .eq('id', staffId)
            .single();

        if (!staff || staff.shop_id !== shopId) {
            throw new ForbiddenException('You do not have permission to delete this staff member');
        }

        const { error } = await this.supabaseService.getClient()
            .from('admins')
            .delete()
            .eq('id', staffId);

        if (error) throw error;
        return { success: true };
    }
}
