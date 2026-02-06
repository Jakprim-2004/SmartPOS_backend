import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class StaffLogsService {
    constructor(private readonly supabaseService: SupabaseService) { }

    async createLog(staffId: number, action: string, details: any) {
        const { error } = await this.supabaseService
            .getClient()
            .from('staff_logs')
            .insert([{
                staff_id: staffId,
                action,
                details
            }]);

        if (error) {
            console.error('Error creating staff log:', error);
        }
    }

    async findAll(paginationDto: PaginationDto, staffId?: number, action?: string, shopId?: string) {
        const { limit = 20, offset = 0 } = paginationDto;
        const from = offset;
        const to = from + limit - 1;

        let query = this.supabaseService
            .getClient()
            .from('staff_logs')
            .select('*, Staff:admins!inner(name, username, shop_id)', { count: 'exact' });

        if (shopId) {
            query = query.eq('Staff.shop_id', shopId);
        }

        if (staffId) {
            query = query.eq('staff_id', staffId);
        }

        if (action) {
            query = query.ilike('action', `%${action}%`);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error fetching staff logs:', error);
            return { data: [], total: 0, limit, offset, nextPage: null };
        }

        const total = count || 0;
        const hasNext = offset + limit < total;

        return {
            data,
            total,
            limit,
            offset,
            nextPage: hasNext ? offset + limit : null
        };
    }
}
