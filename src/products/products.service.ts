import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { Product } from './interfaces/product.interface';
import { StaffLogsService } from '../staff-logs/staff-logs.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly staffLogsService: StaffLogsService
    ) { }

    async findAll(shopId?: string): Promise<Product[]> {
        let query = this.supabaseService
            .getClient()
            .from('products')
            .select('*, category:categories(id, name)')
            .order('name', { ascending: true });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error } = await query;

        if (error) return [];
        return data.map(this.mapToProduct);
    }

    async findPaginated(
        paginationDto: PaginationDto,
        search?: string,
        categoryId?: number,
        shopId?: string,
        stockStatus?: string
    ): Promise<{ data: Product[], total: number, limit: number, offset: number, nextPage: number | null }> {
        const { limit = 10, offset = 0 } = paginationDto;
        const from = offset;
        const to = offset + limit - 1;

        let query = this.supabaseService
            .getClient()
            .from('products')
            .select('*, category:categories(id, name)', { count: 'exact' });

        if (search) {
            query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%`);
        }

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        // Filter by stock status
        if (stockStatus === 'out_of_stock') {
            query = query.eq('stock', 0);
        } else if (stockStatus === 'in_stock') {
            query = query.gt('stock', 0);
        } else if (stockStatus === 'low_stock') {
            query = query.gt('stock', 0).lte('stock', 10);
        }

        const { data, error, count } = await query
            .order('name', { ascending: true })
            .range(from, to);

        if (error) {
            console.error('Error in findPaginated:', error);
            return { data: [], total: 0, limit, offset, nextPage: null };
        }

        const total = count || 0;
        const hasNext = offset + limit < total;

        return {
            data: (data || []).map((item: any) => this.mapToProduct(item)),
            total,
            limit,
            offset,
            nextPage: hasNext ? offset + limit : null
        };
    }

    async findOne(id: number): Promise<Product | null> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('products')
            .select('*, category:categories(id, name)')
            .eq('id', id)
            .single();

        if (error) return null;
        return this.mapToProduct(data);
    }

    async findByCategoryId(categoryId: number, shopId?: string): Promise<Product[]> {
        let query = this.supabaseService
            .getClient()
            .from('products')
            .select('*, category:categories(id, name)')
            .eq('category_id', categoryId)
            .order('name', { ascending: true });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error } = await query;

        if (error) return [];
        return data.map(this.mapToProduct);
    }

    async findByBarcode(barcode: string, shopId?: string): Promise<Product | null> {
        let query = this.supabaseService
            .getClient()
            .from('products')
            .select('*, category:categories(id, name)')
            .eq('barcode', barcode);

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error } = await query.single();

        if (error) return null;
        return this.mapToProduct(data);
    }

    async create(dto: CreateProductDto, shopId?: string): Promise<Product> {
        const insertData: any = {
            name: dto.name,
            price: dto.price,
            cost: dto.cost,
            category_id: dto.categoryId,
            image_url: dto.imageUrl,
            stock: dto.stock,
            barcode: dto.barcode,
            created_by: dto.createdBy
        };

        if (shopId) {
            insertData.shop_id = shopId;
        }

        const { data, error } = await this.supabaseService
            .getClient()
            .from('products')
            .insert([insertData])
            .select()
            .single();

        if (error) throw error;

        // Log action
        if (dto.createdBy) {
            await this.staffLogsService.createLog(dto.createdBy, 'CREATE_PRODUCT', {
                productId: data.id,
                productName: data.name
            });
        }

        return this.mapToProduct(data);
    }

    async update(id: number, dto: UpdateProductDto, userId?: number): Promise<Product | null> {
        const updateData: Record<string, unknown> = {};
        if (dto.name) updateData.name = dto.name;
        if (dto.price !== undefined) updateData.price = dto.price;
        if (dto.cost !== undefined) updateData.cost = dto.cost;
        if (dto.imageUrl) updateData.image_url = dto.imageUrl;
        if (dto.stock !== undefined) updateData.stock = dto.stock;
        if (dto.barcode) updateData.barcode = dto.barcode;

        // Try update with category_id
        if (dto.categoryId) {
            updateData.category_id = dto.categoryId;
        }

        const { data, error } = await this.supabaseService
            .getClient()
            .from('products')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) return null;

        if (userId) {
            await this.staffLogsService.createLog(userId, 'UPDATE_PRODUCT', {
                productId: id,
                updates: updateData
            });
        }

        return this.mapToProduct(data);
    }

    async updateStock(id: number, quantity: number): Promise<Product | null> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('products')
            .update({ stock: quantity })
            .eq('id', id)
            .select()
            .single();

        if (error) return null;
        return this.mapToProduct(data);
    }

    async delete(id: number, userId?: number): Promise<boolean> {
        // Get product info before delete for logging
        const { data: product } = await this.supabaseService.getClient()
            .from('products')
            .select('name')
            .eq('id', id)
            .single();

        const { error } = await this.supabaseService
            .getClient()
            .from('products')
            .delete()
            .eq('id', id);

        if (!error && userId && product) {
            await this.staffLogsService.createLog(userId, 'DELETE_PRODUCT', {
                productId: id,
                productName: product.name
            });
        }

        return !error;
    }

    async search(query: string, shopId?: string): Promise<Product[]> {
        let q = this.supabaseService
            .getClient()
            .from('products')
            .select('*, category:categories(id, name)')
            .or(`name.ilike.%${query}%,barcode.ilike.%${query}%`);

        if (shopId) {
            q = q.eq('shop_id', shopId);
        }

        const { data, error } = await q.order('name', { ascending: true });

        if (error) return [];
        return data.map(this.mapToProduct);
    }

    async addImage(productId: number, url: string, isMain: boolean = false): Promise<any> {
        const client = this.supabaseService.getClient();

        if (isMain) {
            // Unset other main images
            await client.from('product_images').update({ is_main: false }).eq('product_id', productId);
            // Update main product table too
            await client.from('products').update({ image_url: url }).eq('id', productId);
        }

        const { data, error } = await client
            .from('product_images')
            .insert([{ product_id: productId, url, is_main: isMain }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async removeImage(imageId: number): Promise<boolean> {
        const client = this.supabaseService.getClient();
        const { error } = await client.from('product_images').delete().eq('id', imageId);
        return !error;
    }

    async setMainImage(productId: number, imageId: number): Promise<boolean> {
        const client = this.supabaseService.getClient();

        // 1. Get image URL
        const { data: img } = await client.from('product_images').select('url').eq('id', imageId).single();
        if (!img) return false;

        // 2. Unset all
        await client.from('product_images').update({ is_main: false }).eq('product_id', productId);

        // 3. Set new main
        await client.from('product_images').update({ is_main: true }).eq('id', imageId);

        // 4. Update product table
        await client.from('products').update({ image_url: img.url }).eq('id', productId);

        return true;
    }

    async getImages(productId: number): Promise<any[]> {
        const { data, error } = await this.supabaseService.getClient()
            .from('product_images')
            .select('*')
            .eq('product_id', productId)
            .order('is_main', { ascending: false });

        return data || [];
    }

    private mapToProduct(data: Record<string, unknown>): Product {
        return {
            id: data.id as number,
            name: data.name as string,
            price: data.price as number,
            cost: data.cost as number,
            categoryId: data.category_id as number,
            category: data.category as { id: number; name: string },
            imageUrl: data.image_url as string,
            stock: data.stock as number,
            barcode: data.barcode as string,
            createdAt: new Date(data.created_at as string),
            updatedAt: new Date(data.updated_at as string),
        };
    }

    async addStock(id: number, qty: number, userId?: number): Promise<Product> {
        const client = this.supabaseService.getClient();

        // 1. Get current stock
        const { data: product, error: findError } = await client
            .from('products')
            .select('name, stock')
            .eq('id', id)
            .single();

        if (findError || !product) throw new Error('Product not found');

        const newStock = (product.stock || 0) + qty;

        // 2. Update product stock
        const { data, error } = await client
            .from('products')
            .update({ stock: newStock })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // 3. Log transaction
        try {
            await client.from('stock_transactions').insert([{
                product_id: id,
                qty: qty,
                type: 'IN',
                reason: 'Manual Add',
            }]);
        } catch (e) {
            console.warn('Failed to log stock transaction:', e);
        }

        // 4. Log staff action
        if (userId) {
            await this.staffLogsService.createLog(userId, 'ADD_STOCK', {
                productId: id,
                productName: product.name,
                addedQty: qty,
                newTotalStock: newStock
            });
        }

        return this.mapToProduct(data);
    }

    async getAllStockTransactions(shopId?: string): Promise<any[]> {
        try {
            let query = this.supabaseService
                .getClient()
                .from('stock_transactions')
                .select('*, Product:products!inner(*)') // Inner join for shop filtering
                .order('created_at', { ascending: false })
                .limit(100);

            if (shopId) {
                query = query.eq('Product.shop_id', shopId);
            }

            const { data, error } = await query;

            if (error) return [];
            return data;
        } catch (e) {
            return [];
        }
    }

    async getStockHistory(id: number): Promise<any[]> {
        // Try to fetch history
        try {
            const { data, error } = await this.supabaseService
                .getClient()
                .from('stock_transactions')
                .select('*, Product:products(*)')
                .eq('product_id', id)
                .order('created_at', { ascending: false });

            if (error) return [];
            return data;
        } catch (e) {
            return []; // Return empty if table doesn't exist
        }
    }
}
