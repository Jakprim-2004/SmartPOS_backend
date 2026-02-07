import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { StaffLogsService } from '../staff-logs/staff-logs.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CategoriesService {
    constructor(
        private readonly supabase: SupabaseService,
        private readonly staffLogsService: StaffLogsService
    ) { }

    async findAll(shopId?: string, paginationDto?: PaginationDto) {
        const { limit, offset } = paginationDto || {};
        const hasPagination = limit !== undefined && offset !== undefined;

        let query = this.supabase.getClient()
            .from('categories')
            .select('*', { count: 'exact' });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        if (hasPagination) {
            // Ensure numbers just in case transform failed
            const from = Number(offset);
            const to = Number(offset) + Number(limit) - 1;
            query = query.range(from, to);
        }

        const { data, error, count } = await query.order('name');

        if (error) {
            console.error('Categories FindAll Error:', error);
            throw error;
        }

        // If pagination was requested, return paginated structure
        if (hasPagination) {
            return {
                data: data,
                total: count || 0,
                limit,
                offset,
                nextPage: (count && (offset + limit < count)) ? offset + limit : null
            };
        }

        // Otherwise return array (backward compatibility)
        return data;
    }

    async create(dto: CreateCategoryDto, userId?: number, shopId?: string) {
        const insertData: any = { ...dto };
        if (shopId) insertData.shop_id = shopId;

        const { data, error } = await this.supabase.getClient()
            .from('categories')
            .insert([insertData])
            .select()
            .single();

        if (error) throw error;

        if (userId) {
            await this.staffLogsService.createLog(userId, 'CREATE_CATEGORY', {
                categoryId: data.id,
                categoryName: data.name
            });
        }

        return data;
    }

    async update(id: number, dto: UpdateCategoryDto, userId?: number) {
        const { data, error } = await this.supabase.getClient()
            .from('categories')
            .update(dto)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (userId) {
            await this.staffLogsService.createLog(userId, 'UPDATE_CATEGORY', {
                categoryId: id,
                updates: dto
            });
        }

        return data;
    }

    async delete(id: number, userId?: number) {
        // Get category info before delete for logging
        const { data: category } = await this.supabase.getClient()
            .from('categories')
            .select('name')
            .eq('id', id)
            .single();

        const { error } = await this.supabase.getClient()
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;

        if (userId && category) {
            await this.staffLogsService.createLog(userId, 'DELETE_CATEGORY', {
                categoryId: id,
                categoryName: category.name
            });
        }

        return { success: true };
    }
}
