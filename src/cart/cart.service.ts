import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateCartDto } from './dto/cart.dto';

@Injectable()
export class CartService {
    constructor(private readonly supabaseService: SupabaseService) { }

    async getCart(staffId?: string) {
        const client = this.supabaseService.getClient();

        let query = client
            .from('active_carts')
            .select(`
                *,
                active_cart_items (
                    id,
                    product_id,
                    quantity,
                    products (*)
                )
            `);

        if (staffId) {
            query = query.eq('staff_id', staffId);
        } else {
            query = query.is('staff_id', null);
        }

        const { data, error } = await query.single();

        if (error || !data) return null;
        return data;
    }

    async updateCart(dto: UpdateCartDto, staffId?: string) {
        const client = this.supabaseService.getClient();

        // 1. Get or create cart
        let cartId: number;
        const currentCart = await this.getCart(staffId);

        if (!currentCart) {
            const { data, error } = await client
                .from('active_carts')
                .insert([{
                    staff_id: staffId || null,
                    customer_id: dto.customerId || null
                }])
                .select()
                .single();
            if (error) throw error;
            cartId = data.id;
        } else {
            cartId = currentCart.id;
            // Update customer_id if changed
            await client.from('active_carts').update({ customer_id: dto.customerId || null }).eq('id', cartId);
        }

        // 2. Sync items (simplest way is delete and re-insert)
        await client.from('active_cart_items').delete().eq('cart_id', cartId);

        if (dto.items.length > 0) {
            const items = dto.items.map(item => ({
                cart_id: cartId,
                product_id: item.productId,
                quantity: item.quantity
            }));
            const { error: itemError } = await client.from('active_cart_items').insert(items);
            if (itemError) throw itemError;
        }

        return this.getCart(staffId);
    }

    async clearCart(staffId?: string) {
        const cart = await this.getCart(staffId);
        if (cart) {
            await this.supabaseService.getClient().from('active_carts').delete().eq('id', cart.id);
        }
        return true;
    }
}
