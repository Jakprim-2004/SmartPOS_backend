import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateHeldBillDto } from './dto/held-bill.dto';

@Injectable()
export class HeldBillsService {
    constructor(private readonly supabaseService: SupabaseService) { }

    async findAll(shopId?: string) {
        let query = this.supabaseService
            .getClient()
            .from('held_bills')
            .select('*, held_bill_items(*)')
            .order('created_at', { ascending: false });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error } = await query;

        if (error) return [];
        return data;
    }

    async create(dto: CreateHeldBillDto, shopId?: string) {
        const client = this.supabaseService.getClient();

        // 1. Insert header
        const insertData: any = {
            customer_id: dto.customerId || null,
            subtotal: dto.subtotal,
            discount: dto.discount,
            total: dto.total,
            notes: dto.notes,
        };

        if (shopId) insertData.shop_id = shopId;

        const { data: bill, error: billError } = await client
            .from('held_bills')
            .insert([insertData])
            .select()
            .single();

        if (billError) throw billError;

        // 2. Insert items
        const items = dto.items.map(item => ({
            held_bill_id: bill.id,
            product_id: item.productId,
            product_name: item.productName,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
        }));

        const { error: itemsError } = await client
            .from('held_bill_items')
            .insert(items);

        if (itemsError) throw itemsError;

        return this.findOne(bill.id);
    }

    async findOne(id: number) {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('held_bills')
            .select('*, held_bill_items(*)')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    }

    async delete(id: number) {
        const { error } = await this.supabaseService
            .getClient()
            .from('held_bills')
            .delete()
            .eq('id', id);

        return !error;
    }
}
