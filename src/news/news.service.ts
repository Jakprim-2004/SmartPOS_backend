import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto';
import { News } from './interfaces/news.interface';
import { StaffLogsService } from '../staff-logs/staff-logs.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class NewsService {
    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly staffLogsService: StaffLogsService
    ) { }

    async findPaginated(
        paginationDto: PaginationDto,
        shopId?: string
    ): Promise<{ data: News[], total: number, limit: number, offset: number, nextPage: number | null }> {
        const { limit = 10, offset = 0 } = paginationDto;
        const from = offset;
        const to = offset + limit - 1;

        let query = this.supabaseService
            .getClient()
            .from('news')
            .select('*', { count: 'exact' });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error in findPaginated news:', error);
            return { data: [], total: 0, limit, offset, nextPage: null };
        }

        const total = count || 0;
        const hasNext = offset + limit < total;

        return {
            data: (data || []).map(item => this.mapToNews(item)),
            total,
            limit,
            offset,
            nextPage: hasNext ? offset + limit : null
        };
    }

    async findAll(shopId?: string): Promise<News[]> {
        let query = this.supabaseService
            .getClient()
            .from('news')
            .select('*')
            .order('created_at', { ascending: false });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error } = await query;

        if (error) return [];
        return (data || []).map(item => this.mapToNews(item));
    }

    async findPublished(shopId?: string): Promise<News[]> {
        let query = this.supabaseService
            .getClient()
            .from('news')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error } = await query;

        if (error) return [];
        return (data || []).map(item => this.mapToNews(item));
    }

    async findOne(id: number): Promise<News | null> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('news')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return this.mapToNews(data);
    }

    async create(dto: CreateNewsDto, userId?: number, shopId?: string): Promise<News> {
        const insertData: any = {
            title: dto.title,
            content: dto.content,
            image_url: dto.imageUrl,
            is_published: dto.isPublished !== undefined ? dto.isPublished : true,
        };

        if (shopId) insertData.shop_id = shopId;

        // Defensive check: ensure title is not null or empty
        if (!insertData.title) {
            insertData.title = dto.content ? (dto.content.substring(0, 30) + (dto.content.length > 30 ? '...' : '')) : 'ประกาศใหม่';
        }

        const { data, error } = await this.supabaseService
            .getClient()
            .from('news')
            .insert([insertData])
            .select()
            .single();

        if (error) throw error;

        if (userId) {
            await this.staffLogsService.createLog(userId, 'CREATE_NEWS', {
                newsId: data.id,
                title: data.title
            });
        }

        return this.mapToNews(data);
    }

    async update(id: number, dto: UpdateNewsDto, userId?: number): Promise<News | null> {
        const updateData: Record<string, unknown> = {};
        if (dto.title) updateData.title = dto.title;
        if (dto.content) updateData.content = dto.content;
        if (dto.imageUrl) updateData.image_url = dto.imageUrl;
        if (dto.isPublished !== undefined) updateData.is_published = dto.isPublished;

        const { data, error } = await this.supabaseService
            .getClient()
            .from('news')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) return null;

        if (userId) {
            await this.staffLogsService.createLog(userId, 'UPDATE_NEWS', {
                newsId: id,
                updates: updateData
            });
        }

        return this.mapToNews(data);
    }

    async delete(id: number, userId?: number): Promise<boolean> {
        // Get news info before delete for logging
        const { data: news } = await this.supabaseService.getClient()
            .from('news')
            .select('title')
            .eq('id', id)
            .single();

        const { error } = await this.supabaseService
            .getClient()
            .from('news')
            .delete()
            .eq('id', id);

        if (!error && userId && news) {
            await this.staffLogsService.createLog(userId, 'DELETE_NEWS', {
                newsId: id,
                title: news.title
            });
        }

        return !error;
    }

    private mapToNews(data: any): News {
        if (!data) return {} as any;
        return {
            id: Number(data.id),
            title: String(data.title || ''),
            content: String(data.content || ''),
            imageUrl: data.image_url ? String(data.image_url) : undefined,
            isPublished: Boolean(data.is_published),
            createdAt: data.created_at ? new Date(data.created_at) : new Date(),
            updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
        };
    }
}
