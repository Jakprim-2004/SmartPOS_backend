import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface PromotionProduct {
    id: number;
    promotion_id: number;
    product_id: number;
    created_at?: string;
}

@Injectable()
export class PromotionProductsService {
    constructor(private readonly supabaseService: SupabaseService) { }

    // Get products for a specific promotion
    async getProductsByPromotion(promotionId: number): Promise<number[]> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('promotion_products')
            .select('product_id')
            .eq('promotion_id', promotionId);

        if (error) {
            console.error('Error fetching promotion products:', error);
            return [];
        }
        return data.map((item: any) => item.product_id);
    }

    // Get promotions for a specific product (for auto-apply)
    async getPromotionsByProduct(productId: number): Promise<any[]> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('promotion_products')
            .select(`
                promotion_id,
                promotions (
                    id, name, description, discount_type, discount_value, 
                    start_date, end_date, is_active, image_url
                )
            `)
            .eq('product_id', productId);

        if (error) {
            console.error('Error fetching promotions for product:', error);
            return [];
        }

        // Filter only active promotions
        const now = new Date();
        return data
            .map((item: any) => item.promotions)
            .filter((promo: any) => {
                if (!promo || !promo.is_active) return false;
                const start = promo.start_date ? new Date(promo.start_date) : null;
                const end = promo.end_date ? new Date(promo.end_date) : null;
                if (start && now < start) return false;
                if (end && now > end) return false;
                return true;
            })
            .map((promo: any) => ({
                id: promo.id,
                title: promo.name,
                description: promo.description,
                discount_type: promo.discount_type,
                discount_value: promo.discount_value,
                start_date: promo.start_date,
                end_date: promo.end_date,
            }));
    }

    // Set products for a promotion (replace all)
    async setProductsForPromotion(promotionId: number, productIds: number[]): Promise<void> {
        // Delete existing
        await this.supabaseService
            .getClient()
            .from('promotion_products')
            .delete()
            .eq('promotion_id', promotionId);

        // Insert new
        if (productIds.length > 0) {
            const rows = productIds.map(productId => ({
                promotion_id: promotionId,
                product_id: productId,
            }));

            const { error } = await this.supabaseService
                .getClient()
                .from('promotion_products')
                .insert(rows);

            if (error) {
                console.error('Error inserting promotion products:', error);
                throw error;
            }
        }
    }

    // Add a product to a promotion
    async addProductToPromotion(promotionId: number, productId: number): Promise<void> {
        const { error } = await this.supabaseService
            .getClient()
            .from('promotion_products')
            .insert({ promotion_id: promotionId, product_id: productId });

        if (error && error.code !== '23505') { // Ignore duplicate
            throw error;
        }
    }

    // Remove a product from a promotion
    async removeProductFromPromotion(promotionId: number, productId: number): Promise<void> {
        await this.supabaseService
            .getClient()
            .from('promotion_products')
            .delete()
            .eq('promotion_id', promotionId)
            .eq('product_id', productId);
    }
}
