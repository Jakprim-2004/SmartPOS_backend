import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateRewardDto, UpdateRewardDto, RedeemRewardDto } from './dto/reward.dto';
import { Reward, RewardRedemption } from './interfaces/reward.interface';
import { StaffLogsService } from '../staff-logs/staff-logs.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class RewardsService {
    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly staffLogsService: StaffLogsService
    ) { }

    async findPaginated(
        paginationDto: PaginationDto,
        shopId?: string
    ): Promise<{ data: Reward[], total: number, limit: number, offset: number, nextPage: number | null }> {
        const { limit = 10, offset = 0 } = paginationDto;
        const from = offset;
        const to = offset + limit - 1;

        let query = this.supabaseService
            .getClient()
            .from('rewards')
            .select('*', { count: 'exact' });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error in findPaginated rewards:', error);
            return { data: [], total: 0, limit, offset, nextPage: null };
        }

        const total = count || 0;
        const hasNext = offset + limit < total;

        return {
            data: (data || []).map(this.mapToReward),
            total,
            limit,
            offset,
            nextPage: hasNext ? offset + limit : null
        };
    }

    async findAll(shopId?: string): Promise<Reward[]> {
        let query = this.supabaseService
            .getClient()
            .from('rewards')
            .select('*')
            .order('created_at', { ascending: false });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error } = await query;

        if (error) return [];
        return (data || []).map(this.mapToReward);
    }

    async findActive(shopId?: string): Promise<Reward[]> {
        let query = this.supabaseService
            .getClient()
            .from('rewards')
            .select('*')
            .eq('is_active', true)
            .gt('stock', 0)
            .order('created_at', { ascending: false });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error } = await query;

        if (error) return [];
        return (data || []).map(this.mapToReward);
    }

    async findOne(id: number): Promise<Reward | null> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('rewards')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return this.mapToReward(data);
    }

    async create(dto: CreateRewardDto, userId?: number, shopId?: string): Promise<Reward> {
        const insertData: any = {
            title: dto.title,
            description: dto.description,
            points_required: dto.pointsRequired,
            stock: dto.stock,
            image_url: dto.imageUrl,
            is_active: true,
        };

        if (shopId) insertData.shop_id = shopId;

        const { data, error } = await this.supabaseService
            .getClient()
            .from('rewards')
            .insert([insertData])
            .select()
            .single();

        if (error) throw error;

        if (userId) {
            await this.staffLogsService.createLog(userId, 'CREATE_REWARD', {
                rewardId: data.id,
                title: data.title
            });
        }

        return this.mapToReward(data);
    }

    async update(id: number, dto: UpdateRewardDto, userId?: number): Promise<Reward | null> {
        const updateData: Record<string, unknown> = {};
        if (dto.title) updateData.title = dto.title;
        if (dto.description) updateData.description = dto.description;
        if (dto.pointsRequired !== undefined) updateData.points_required = dto.pointsRequired;
        if (dto.stock !== undefined) updateData.stock = dto.stock;
        if (dto.imageUrl) updateData.image_url = dto.imageUrl;
        if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

        const { data, error } = await this.supabaseService
            .getClient()
            .from('rewards')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) return null;

        if (userId) {
            await this.staffLogsService.createLog(userId, 'UPDATE_REWARD', {
                rewardId: id,
                updates: updateData
            });
        }

        return this.mapToReward(data);
    }

    async delete(id: number, userId?: number): Promise<boolean> {
        // Get reward info before delete for logging
        const { data: reward } = await this.supabaseService.getClient()
            .from('rewards')
            .select('title')
            .eq('id', id)
            .single();

        const { error } = await this.supabaseService
            .getClient()
            .from('rewards')
            .delete()
            .eq('id', id);

        if (!error && userId && reward) {
            await this.staffLogsService.createLog(userId, 'DELETE_REWARD', {
                rewardId: id,
                title: reward.title
            });
        }

        return !error;
    }

    async redeem(dto: RedeemRewardDto, userId?: number): Promise<RewardRedemption | null> {
        const reward = await this.findOne(dto.rewardId);
        if (!reward || reward.stock <= 0) {
            throw new Error('Reward out of stock or not found');
        }

        const supabase = this.supabaseService.getClient();

        // 0. Check customer points
        const { data: customer, error: custError } = await supabase
            .from('customers')
            .select('points')
            .eq('id', dto.customerId)
            .single();

        if (custError || !customer) throw new Error('Customer not found');
        if (customer.points < reward.pointsRequired) {
            throw new Error('Insufficient points');
        }

        // 1. Decrease stock
        await this.update(reward.id, { stock: reward.stock - 1 });

        // 1.5 Deduct points from customer
        await supabase
            .from('customers')
            .update({ points: customer.points - reward.pointsRequired })
            .eq('id', dto.customerId);

        // 2. Create redemption record
        const { data, error } = await supabase
            .from('reward_redemptions')
            .insert([{
                customer_id: dto.customerId,
                reward_id: dto.rewardId,
                points_used: reward.pointsRequired,
                status: 'pending',
            }])
            .select()
            .single();

        if (error) return null;

        // Log action
        if (userId) {
            await this.staffLogsService.createLog(userId, 'REDEEM_REWARD', {
                rewardId: dto.rewardId,
                rewardTitle: reward.title,
                customerId: dto.customerId,
                pointsUsed: reward.pointsRequired
            });
        }

        return this.mapToRedemption(data);
    }

    async getRedemptionsByCustomer(customerId: number): Promise<RewardRedemption[]> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('reward_redemptions')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (error) return [];
        return (data || []).map(this.mapToRedemption);
    }

    private mapToReward(data: Record<string, unknown>): Reward {
        return {
            id: data.id as number,
            title: data.title as string,
            description: data.description as string,
            pointsRequired: data.points_required as number,
            stock: data.stock as number,
            imageUrl: data.image_url as string,
            isActive: data.is_active as boolean,
            createdAt: new Date(data.created_at as string),
            updatedAt: new Date(data.updated_at as string),
        };
    }

    private mapToRedemption(data: Record<string, unknown>): RewardRedemption {
        return {
            id: data.id as number,
            customerId: data.customer_id as number,
            rewardId: data.reward_id as number,
            pointsUsed: data.points_used as number,
            status: data.status as 'pending' | 'claimed' | 'cancelled',
            createdAt: new Date(data.created_at as string),
        };
    }
}
