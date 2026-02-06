import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto/coupon.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Coupon } from './interfaces/coupon.interface';

@Injectable()
export class CouponsService {
    constructor(private readonly supabaseService: SupabaseService) { }

    async findPaginated(
        paginationDto: PaginationDto,
        search?: string,
        shopId?: string
    ): Promise<{ data: Coupon[], total: number, limit: number, offset: number, nextPage: number | null }> {
        const { limit = 10, offset = 0 } = paginationDto;
        const from = offset;
        const to = offset + limit - 1;

        let query = this.supabaseService
            .getClient()
            .from('coupons')
            .select('*', { count: 'exact' });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        if (search) {
            query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error in findPaginated coupons:', error);
            return { data: [], total: 0, limit, offset, nextPage: null };
        }

        const total = count || 0;
        const hasNext = offset + limit < total;

        return {
            data: (data || []).map(item => this.mapToCoupon(item)),
            total,
            limit,
            offset,
            nextPage: hasNext ? offset + limit : null
        };
    }

    async findAll(shopId?: string): Promise<Coupon[]> {
        console.log(`[CouponsService] findAll called with shopId: ${shopId}`);
        let query = this.supabaseService
            .getClient()
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error } = await query;
        console.log(`[CouponsService] query result - Error: ${!!error}, Data: ${data ? data.length + ' items' : 'NULL'}`);

        if (error) {
            console.error('[CouponsService] Supabase Error:', error);
            return [];
        }
        return (data || []).map(item => this.mapToCoupon(item));
    }

    async findOne(id: number): Promise<Coupon | null> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('coupons')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return this.mapToCoupon(data);
    }

    async findByCode(code: string, shopId?: string): Promise<Coupon | null> {
        let query = this.supabaseService
            .getClient()
            .from('coupons')
            .select('*')
            .eq('code', code.toUpperCase());

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error } = await query.maybeSingle();

        if (error || !data) return null;
        return this.mapToCoupon(data);
    }

    async create(dto: CreateCouponDto, shopId?: string): Promise<Coupon> {
        console.log(`[CouponsService] Creating coupon code: ${dto.code}, shopId: ${shopId}`);

        if (!dto.code) {
            throw new HttpException('กรุณาระบุรหัสคูปอง (Code is required)', HttpStatus.BAD_REQUEST);
        }

        const insertData: any = {
            code: dto.code.toUpperCase(),
            // title: dto.title, // Column title does not exist
            description: dto.description || dto.title, // Use logic Use description as main text
            discount_type: dto.discountType,
            discount_value: dto.discountValue,
            min_spend: dto.minPurchase || 0, // Mapped to min_spend
            max_usage: dto.maxUses || 9999,  // Mapped to max_usage
            current_usage: 0,                // Mapped to current_usage
            // start_date: dto.startDate, // Column does not exist
            expiry_date: dto.endDate,     // Mapped to expiry_date
            is_active: true,
        };
        if (shopId) insertData.shop_id = shopId;

        const { data, error } = await this.supabaseService
            .getClient()
            .from('coupons')
            .insert([insertData])
            .select()
            .single();

        if (error) {
            console.error('[CouponsService] Create Error:', error);
            if (error.code === '23505') {
                throw new HttpException('รหัสคูปองนี้ถูกใช้งานแล้ว', HttpStatus.BAD_REQUEST);
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return this.mapToCoupon(data);
    }

    async update(id: number, dto: UpdateCouponDto): Promise<Coupon | null> {
        const updateData: Record<string, unknown> = {};
        if (dto.code) updateData.code = dto.code.toUpperCase();
        // if (dto.title) updateData.title = dto.title; // Removed
        if (dto.description) updateData.description = dto.description;
        if (dto.title && !dto.description) updateData.description = dto.title; // Fallback
        if (dto.discountType) updateData.discount_type = dto.discountType;
        if (dto.discountValue !== undefined) updateData.discount_value = dto.discountValue;
        if (dto.minPurchase !== undefined) updateData.min_spend = dto.minPurchase; // Mapped
        if (dto.maxUses !== undefined) updateData.max_usage = dto.maxUses;     // Mapped
        // if (dto.startDate) updateData.start_date = dto.startDate;
        if (dto.endDate) updateData.expiry_date = dto.endDate;
        if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

        const { data, error } = await this.supabaseService
            .getClient()
            .from('coupons')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) return null;
        return this.mapToCoupon(data);
    }

    async delete(id: number): Promise<boolean> {
        const { error } = await this.supabaseService
            .getClient()
            .from('coupons')
            .delete()
            .eq('id', id);

        return !error;
    }

    async validate(dto: ValidateCouponDto, shopId?: string): Promise<{ valid: boolean; discount: number; message: string }> {
        const coupon = await this.findByCode(dto.code, shopId);
        if (!coupon) return { valid: false, discount: 0, message: 'ไม่พบคูปอง' };

        if (!coupon.isActive) return { valid: false, discount: 0, message: 'คูปองถูกปิดใช้งาน' };
        if (coupon.usedCount >= coupon.maxUses) return { valid: false, discount: 0, message: 'คูปองถูกใช้ครบแล้ว' };
        if (dto.purchaseAmount < coupon.minPurchase) return { valid: false, discount: 0, message: `ต้องซื้อขั้นต่ำ ${coupon.minPurchase} บาท` };

        const now = new Date();
        // Check Expiry
        if (coupon.endDate && now > coupon.endDate) return { valid: false, discount: 0, message: 'คูปองหมดอายุ' };

        let discount = coupon.discountType === 'percentage' ? (dto.purchaseAmount * coupon.discountValue / 100) : coupon.discountValue;
        if (coupon.discountType === 'percentage') discount = Math.min(discount, dto.purchaseAmount); // Cap at purchase amount? No, usually cap at limit but logic not here.

        return { valid: true, discount, message: 'ใช้คูปองสำเร็จ' };
    }

    async useCoupon(code: string, shopId?: string): Promise<boolean> {
        const coupon = await this.findByCode(code, shopId);
        if (!coupon) return false;

        const { error } = await this.supabaseService
            .getClient()
            .from('coupons')
            .update({ current_usage: coupon.usedCount + 1 }) // Mapped to current_usage
            .eq('id', coupon.id);

        return !error;
    }

    private mapToCoupon(data: Record<string, unknown>): Coupon {
        return {
            id: data.id as number,
            code: data.code as string,
            title: (data.title as string) || (data.description as string) || (data.code as string), // Fallback title
            description: data.description as string,
            discountType: data.discount_type as 'percentage' | 'fixed',
            discountValue: data.discount_value as number,
            minPurchase: (data.min_spend as number) || (data.min_purchase as number) || 0, // Fallback
            maxUses: (data.max_usage as number) || (data.max_uses as number) || 0, // Fallback
            usedCount: (data.current_usage as number) || (data.used_count as number) || 0, // Fallback
            startDate: new Date(data.created_at as string), // Use created_at as start date fallback
            endDate: data.expiry_date ? new Date(data.expiry_date as string) : undefined, // Map expiry_date to endDate
            isActive: data.is_active as boolean,
            createdAt: new Date(data.created_at as string),
            updatedAt: new Date(data.updated_at as string),
        };
    }
}
