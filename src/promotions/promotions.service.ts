import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';
import { Promotion } from './interfaces/promotion.interface';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class PromotionsService {
    constructor(private readonly supabaseService: SupabaseService) { }

    async findPaginated(
        paginationDto: PaginationDto,
        search?: string,
        status?: string,
        shopId?: string
    ): Promise<{ data: Promotion[], total: number, limit: number, offset: number, nextPage: number | null }> {
        const { limit = 10, offset = 0 } = paginationDto;
        const from = offset;
        const to = offset + limit - 1;

        let query = this.supabaseService
            .getClient()
            .from('promotions')
            .select('*', { count: 'exact' });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        const now = new Date().toISOString();
        if (status === 'ใช้งานอยู่') {
            query = query.eq('is_active', true).lte('start_date', now).gte('end_date', now);
        } else if (status === 'กำลังจะเริ่ม') {
            query = query.eq('is_active', true).gt('start_date', now);
        } else if (status === 'หมดอายุ') {
            query = query.lt('end_date', now);
        } else if (status === 'ปิดใช้งาน') {
            query = query.eq('is_active', false);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error in findPaginated promotions:', error);
            return { data: [], total: 0, limit, offset, nextPage: null };
        }

        const total = count || 0;
        const hasNext = offset + limit < total;

        return {
            data: (data || []).map(item => this.mapToPromotion(item)),
            total,
            limit,
            offset,
            nextPage: hasNext ? offset + limit : null
        };
    }

    async findAll(shopId?: string): Promise<Promotion[]> {
        let query = this.supabaseService
            .getClient()
            .from('promotions')
            .select('*')
            .order('created_at', { ascending: false });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error } = await query;

        if (error) return [];
        return data.map(item => this.mapToPromotion(item));
    }

    async findActive(shopId?: string): Promise<Promotion[]> {
        let query = this.supabaseService
            .getClient()
            .from('promotions')
            .select('*')
            .eq('is_active', true)
            .lte('start_date', new Date().toISOString())
            .gte('end_date', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error } = await query;

        if (error) return [];
        return data.map(this.mapToPromotion);
    }

    async findOne(id: number): Promise<Promotion | null> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('promotions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return this.mapToPromotion(data);
    }

    async create(dto: CreatePromotionDto, shopId?: string): Promise<Promotion> {
        console.log('Creating promotion with DTO:', JSON.stringify(dto, null, 2));

        const insertData: any = {
            name: dto.title,
            description: dto.description || '',
            image_url: dto.image_url,
            discount_type: dto.discount_type || 'percentage',
            discount_value: dto.discount_value ?? 0,
            start_date: dto.start_date,
            end_date: dto.end_date,
            is_active: dto.is_active ?? true,
        };

        if (shopId) {
            insertData.shop_id = shopId;
        }

        console.log('Insert data:', JSON.stringify({
            ...insertData,
            image_url: insertData.image_url ? `[BASE64 LENGTH: ${insertData.image_url.length}]` : null
        }, null, 2));

        const { data, error } = await this.supabaseService
            .getClient()
            .from('promotions')
            .insert([insertData])
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Created promotion:', data);
        return this.mapToPromotion(data);
    }

    async update(id: number, dto: UpdatePromotionDto): Promise<Promotion | null> {
        const updateData: Record<string, unknown> = {};
        if (dto.title !== undefined) updateData.name = dto.title; // DB uses 'name'
        if (dto.description !== undefined) updateData.description = dto.description;
        if (dto.image_url !== undefined) updateData.image_url = dto.image_url;
        if (dto.discount_type !== undefined) updateData.discount_type = dto.discount_type;
        if (dto.discount_value !== undefined) updateData.discount_value = dto.discount_value;
        if (dto.start_date !== undefined) updateData.start_date = dto.start_date;
        if (dto.end_date !== undefined) updateData.end_date = dto.end_date;
        if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

        console.log(`Updating promotion ${id} with:`, updateData);

        const { data, error } = await this.supabaseService
            .getClient()
            .from('promotions')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(`Error updating promotion ${id}:`, error);
            return null;
        }
        return this.mapToPromotion(data);
    }

    async delete(id: number): Promise<boolean> {
        const { error } = await this.supabaseService
            .getClient()
            .from('promotions')
            .delete()
            .eq('id', id);

        return !error;
    }

    private mapToPromotion(data: Record<string, unknown>): any {
        return {
            id: data.id as number,
            title: (data.name || data.title) as string || '', // DB uses 'name'
            description: data.description as string || '',
            image_url: data.image_url as string || null,
            discount_type: data.discount_type as string || null,
            discount_value: data.discount_value as number || null,
            start_date: data.start_date as string || null,
            end_date: data.end_date as string || null,
            is_active: data.is_active as boolean ?? true,
            created_at: data.created_at as string || null,
        };
    }
}
