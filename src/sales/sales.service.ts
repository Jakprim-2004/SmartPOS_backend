import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSaleDto, UpdateSaleDto } from './dto/sale.dto';
import { Sale } from './interfaces/sale.interface';
import { StaffLogsService } from '../staff-logs/staff-logs.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class SalesService {
    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly staffLogsService: StaffLogsService
    ) { }

    private async generateBillNumber(shopName?: string): Promise<string> {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const yearBE = (now.getFullYear() + 543).toString().slice(-2);
        const dateStr = `${day}${month}${yearBE}`;

        // Generate prefix from shop name (e.g., "Meow Loan" -> "ml")
        let prefix = 'ss';
        if (shopName) {
            const parts = shopName.trim().split(/\s+/);
            if (parts.length >= 2) {
                prefix = (parts[0][0] + parts[1][0]).toLowerCase();
            } else {
                prefix = shopName.substring(0, 2).toLowerCase();
            }
        }

        try {
            // Find the last bill number for today to increment it
            const { data, error } = await this.supabaseService
                .getClient()
                .from('sales')
                .select('bill_number')
                .like('bill_number', `${prefix}${dateStr}%`)
                .order('bill_number', { ascending: false })
                .limit(1);

            if (error || !data || data.length === 0) {
                return `${prefix}${dateStr}0001`;
            }

            const lastBillNumber = data[0].bill_number;
            // Extract the last 4 digits (sequence)
            const lastSeqStr = lastBillNumber.slice(-4);
            const lastSeq = parseInt(lastSeqStr);
            const nextSeq = (isNaN(lastSeq) ? 1 : lastSeq + 1).toString().padStart(4, '0');

            return `${prefix}${dateStr}${nextSeq}`;
        } catch (err) {
            // Fallback to random if something goes wrong
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            return `${prefix}${dateStr}ERR${random}`;
        }
    }

    async findAll(
        paginationDto: PaginationDto,
        shopId?: string,
        params?: {
            status?: string;
            customerId?: number;
            search?: string;
            startDate?: string;
            endDate?: string;
        }
    ): Promise<{ data: Sale[], total: number, limit: number, offset: number, nextPage: number | null }> {
        const { limit = 20, offset = 0 } = paginationDto;
        const from = offset;
        const to = offset + limit - 1;

        let query = this.supabaseService
            .getClient()
            .from('sales')
            .select('*, sale_items(*), customers(*), staff:admins!inner(id, name, shop_id)', { count: 'exact' });

        if (shopId) {
            query = query.eq('staff.shop_id', shopId);
        }

        if (params?.status) {
            query = query.eq('status', params.status);
        }

        if (params?.customerId) {
            query = query.eq('customer_id', params.customerId);
        }

        if (params?.search) {
            // Search by bill number or customer name/phone if joined
            query = query.ilike('bill_number', `%${params.search}%`);
        }

        if (params?.startDate) {
            query = query.gte('created_at', params.startDate);
        }

        if (params?.endDate) {
            query = query.lte('created_at', params.endDate);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Supabase Error fetching sales:', error);
            return { data: [], total: 0, limit, offset, nextPage: null };
        }

        const total = count || 0;
        const hasNext = offset + limit < total;

        return {
            data: (data || []).map(item => this.mapToSale(item)),
            total,
            limit,
            offset,
            nextPage: hasNext ? offset + limit : null
        };
    }

    async findOne(id: number): Promise<Sale | null> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('sales')
            .select('*, sale_items(*), customers(*), staff:admins(id, name)')
            .eq('id', id)
            .single();

        if (error || !data) return null;
        return this.mapToSale(data);
    }

    async findByBillNumber(billNumber: string, shopId?: string): Promise<Sale | null> {
        let query = this.supabaseService
            .getClient()
            .from('sales')
            .select('*, sale_items(*), customers(*), staff:admins!inner(id, name, shop_id)')
            .eq('bill_number', billNumber);

        if (shopId) {
            query = query.eq('staff.shop_id', shopId);
        }

        const { data, error } = await query.single();

        if (error || !data) return null;
        return this.mapToSale(data);
    }

    // findByCustomer doesn't necessarily need shopId because customers can buy across shops? 
    // Wait, requirement is isolation. If a customer buys in Shop A, Admin Shop B shouldn't see it?
    // Data model: Sales have staff_id. So we CAN filter.
    async findByCustomer(customerId: number, shopId?: string): Promise<Sale[]> {
        let query = this.supabaseService
            .getClient()
            .from('sales')
            .select('*, sale_items(*), staff:admins!inner(shop_id)')
            .eq('customer_id', customerId);

        if (shopId) {
            query = query.eq('staff.shop_id', shopId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) return [];
        return (data || []).map(item => this.mapToSale(item));
    }

    async findByStatus(status: string, shopId?: string): Promise<Sale[]> {
        let query = this.supabaseService
            .getClient()
            .from('sales')
            .select('*, sale_items(*), staff:admins!inner(shop_id)')
            .eq('status', status);

        if (shopId) {
            query = query.eq('staff.shop_id', shopId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) return [];
        return (data || []).map(item => this.mapToSale(item));
    }

    async getTodaySales(shopId?: string): Promise<Sale[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let query = this.supabaseService
            .getClient()
            .from('sales')
            .select('*, sale_items(*), staff:admins!inner(shop_id)')
            .gte('created_at', today.toISOString())
            .eq('status', 'completed');

        if (shopId) {
            query = query.eq('staff.shop_id', shopId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) return [];
        return (data || []).map(item => this.mapToSale(item));
    }

    async create(dto: CreateSaleDto, shopName?: string): Promise<Sale> {
        const client = this.supabaseService.getClient();
        const billNumber = await this.generateBillNumber(shopName);


        try {
            // 1. Insert sale header
            const { data: sale, error: saleError } = await client
                .from('sales')
                .insert([{
                    bill_number: billNumber,
                    customer_id: dto.customerId || null,
                    subtotal: Number(dto.subtotal) || 0,
                    discount: Number(dto.discount) || 0,
                    total: Number(dto.total) || 0,
                    payment_method: dto.paymentMethod || 'cash',
                    amount_received: Number(dto.amountReceived) || Number(dto.total) || 0,
                    change_amount: Number(dto.changeAmount) || 0,
                    status: dto.status || 'completed',
                    staff_id: dto.staffId,
                    coupon_code: dto.couponCode || null,
                    points_redeemed: Number(dto.pointsRedeemed) || 0
                }])
                .select()
                .single();

            if (saleError) {
                console.error('Sale Header Insert Error Details:', saleError);
                throw new Error(`Failed to create sale: ${saleError.message}`);
            }

            if (!sale) throw new Error('Failed to create sale: No data returned from Supabase');

            // 2. Insert sale items
            const saleItems = dto.items.map((item) => ({
                sale_id: sale.id,
                product_id: item.productId,
                product_name: item.productName,
                price: Number(item.price) || 0,
                quantity: Number(item.quantity) || 0,
                subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 0),
            }));

            const { error: itemsError } = await client
                .from('sale_items')
                .insert(saleItems);

            if (itemsError) {
                console.error('Sale Items Insert Error Details:', itemsError);
                // Optional: Rollback sale header if possible, but Supabase doesn't support easy transactions via JS client without RPC
                throw new Error(`Failed to create sale items: ${itemsError.message}`);
            }

            // 3. Update Stock & Log Transactions (Parallel execution for performance)
            await Promise.all(dto.items.map(async (item) => {
                const qty = Number(item.quantity) || 0;

                // Decrement Stock
                const { error: stockError } = await client.rpc('decrement_stock', {
                    p_id: item.productId,
                    p_qty: qty
                });

                // If RPC fails (maybe not exists), try manual update (less safe for concurrency but works for simple cases)
                if (stockError) {
                    // Fallback manual update
                    const { data: current } = await client.from('products').select('stock').eq('id', item.productId).single();
                    if (current) {
                        await client.from('products').update({ stock: (current.stock || 0) - qty }).eq('id', item.productId);
                    }
                }

                // Log Transaction
                await client.from('stock_transactions').insert([{
                    product_id: item.productId,
                    qty: qty,
                    type: 'OUT',
                    reason: `Sale #${billNumber}`,
                    sale_id: sale.id
                }]);
            }));

            const result = await this.findOne(sale.id);
            if (!result) throw new Error('Sale created but could not be retrieved from DB');

            // 3. Update customer points and total spent
            if (dto.customerId) {
                const custId = Number(dto.customerId);
                if (!isNaN(custId)) {
                    try {
                        const { data: customer, error: fetchError } = await client
                            .from('customers')
                            .select('points, total_spent')
                            .eq('id', custId)
                            .single();

                        if (fetchError) {
                            console.error(`Error fetching customer ${custId} for points update:`, fetchError);
                        } else if (customer) {
                            const saleTotal = Number(dto.total) || 0;
                            const pointsRedeemed = Number(dto.pointsRedeemed) || 0;

                            // 100 Baht = 1 Point (Ratio 100:1)
                            const earnedPoints = Math.floor(saleTotal / 100);

                            // Calculate new values
                            const currentPoints = Number(customer.points) || 0;
                            const currentTotalSpent = Number(customer.total_spent) || 0;

                            const newPoints = Math.max(0, currentPoints + earnedPoints - pointsRedeemed);
                            const newTotalSpent = currentTotalSpent + saleTotal;

                            console.log(`Updating Customer ${custId}: Bill #${billNumber}, Total: ${saleTotal}, Earned: ${earnedPoints}, Redeemed: ${pointsRedeemed}`);
                            console.log(`Old Balance - Points: ${currentPoints}, Spent: ${currentTotalSpent}`);
                            console.log(`New Balance - Points: ${newPoints}, Spent: ${newTotalSpent}`);

                            const { error: updateError } = await client
                                .from('customers')
                                .update({
                                    points: newPoints,
                                    total_spent: newTotalSpent,
                                    updated_at: new Date()
                                })
                                .eq('id', custId);

                            if (updateError) {
                                console.error(`Failed to update customer ${custId} points in DB:`, updateError);
                            } else {
                                console.log(`Successfully updated customer ${custId} points.`);
                            }
                        }
                    } catch (customerUpdateError) {
                        console.error('Exception during customer points update:', customerUpdateError);
                        // We don't throw here to ensure the sale is still recorded
                    }
                }
            }

            // 4. Update coupon usage count if coupon was used
            if (dto.couponCode) {
                try {
                    const { data: couponData, error: couponFetchError } = await client
                        .from('coupons')
                        .select('id, current_usage')
                        .eq('code', dto.couponCode)
                        .limit(1);

                    if (!couponFetchError && couponData && couponData.length > 0) {
                        const coupon = couponData[0];
                        await client
                            .from('coupons')
                            .update({ current_usage: (coupon.current_usage || 0) + 1 })
                            .eq('id', coupon.id);
                        console.log(`Updated coupon ${dto.couponCode} usage to ${(coupon.current_usage || 0) + 1}`);
                    }
                } catch (couponUpdateError) {
                    console.error('Failed to update coupon usage:', couponUpdateError);
                    // Don't throw - sale should still complete
                }
            }

            // 5. Log staff action
            if (dto.staffId) {
                await this.staffLogsService.createLog(dto.staffId, 'CREATE_SALE', {
                    saleId: result.id,
                    billNumber: result.billNumber,
                    total: result.total
                });
            }

            return result;

        } catch (error) {
            console.error('SalesService.create Final Error:', error);
            throw error;
        }
    }

    async update(id: number, dto: UpdateSaleDto): Promise<Sale | null> {
        const client = this.supabaseService.getClient();

        // 1. Update sale header
        const updateData: any = {};
        if (dto.status) updateData.status = dto.status;
        if (dto.customerId !== undefined) updateData.customer_id = dto.customerId;
        if (dto.subtotal !== undefined) updateData.subtotal = dto.subtotal;
        if (dto.discount !== undefined) updateData.discount = dto.discount;
        if (dto.total !== undefined) updateData.total = dto.total;
        if (dto.paymentMethod) updateData.payment_method = dto.paymentMethod;
        if (dto.amountReceived !== undefined) updateData.amount_received = dto.amountReceived;
        if (dto.changeAmount !== undefined) updateData.change_amount = dto.changeAmount;
        updateData.updated_at = new Date();

        const { error: headerError } = await client
            .from('sales')
            .update(updateData)
            .eq('id', id);

        if (headerError) {
            console.error('Update Sale Header Error:', headerError);
            return null;
        }

        // 2. Update items if provided
        if (dto.items) {
            // Delete existing items
            const { error: deleteError } = await client
                .from('sale_items')
                .delete()
                .eq('sale_id', id);

            if (deleteError) {
                console.error('Delete Sale Items Error:', deleteError);
            } else {
                // Insert new items
                const saleItems = dto.items.map((item) => ({
                    sale_id: id,
                    product_id: item.productId,
                    product_name: item.productName,
                    price: Number(item.price) || 0,
                    quantity: Number(item.quantity) || 0,
                    subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 0),
                }));

                const { error: insertError } = await client
                    .from('sale_items')
                    .insert(saleItems);

                if (insertError) {
                    console.error('Insert Sale Items Error:', insertError);
                }
            }
        }

        return this.findOne(id);
    }

    async delete(id: number): Promise<boolean> {
        const client = this.supabaseService.getClient();

        // Items are usually deleted by cascade if defined in DB, 
        // but we'll manually ensure they are gone if not.
        await client.from('sale_items').delete().eq('sale_id', id);
        const { error } = await client.from('sales').delete().eq('id', id);

        return !error;
    }

    async findHeldBills(): Promise<Sale[]> {
        return this.findByStatus('held');
    }

    async getSummary(shopId?: string): Promise<{ totalSales: number; totalAmount: number; todaySales: number; todayAmount: number }> {
        const client = this.supabaseService.getClient();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Total Lifetime Summary with Aggregation
        let totalQuery = client
            .from('sales')
            .select('total, staff:admins!inner(shop_id)', { count: 'exact' })
            .eq('status', 'completed');

        if (shopId) {
            totalQuery = totalQuery.eq('staff.shop_id', shopId);
        }

        const { count: totalCount, data: totalData } = await totalQuery;
        const totalAmount = totalData?.reduce((sum, s) => sum + (Number(s.total) || 0), 0) || 0;

        // 2. Today Summary with Aggregation
        let todayQuery = client
            .from('sales')
            .select('total, staff:admins!inner(shop_id)', { count: 'exact' })
            .eq('status', 'completed')
            .gte('created_at', today.toISOString());

        if (shopId) {
            todayQuery = todayQuery.eq('staff.shop_id', shopId);
        }

        const { count: todayCount, data: todayData } = await todayQuery;
        const todayAmount = todayData?.reduce((sum, s) => sum + (Number(s.total) || 0), 0) || 0;

        return {
            totalSales: totalCount || 0,
            totalAmount: totalAmount,
            todaySales: todayCount || 0,
            todayAmount: todayAmount,
        };
    }

    async getDashboardStats(viewType: string = 'daily', year?: number, month?: number, shopId?: string): Promise<any> {
        const client = this.supabaseService.getClient();
        const now = new Date();
        const currentYear = year || now.getFullYear();
        const currentMonth = month || now.getMonth() + 1; // 1-12

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Date Range Logic
        let startDate: Date, endDate: Date;

        if (viewType === 'daily') {
            startDate = new Date(currentYear, currentMonth - 1, 1);
            endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
        } else if (viewType === 'yearly') {
            startDate = new Date(currentYear, 0, 1);
            endDate = new Date(currentYear, 11, 31, 23, 59, 59);
        } else {
            startDate = new Date(currentYear, currentMonth - 1, 1);
            endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
        }

        // Add buffer
        const last30Days = new Date(now);
        last30Days.setDate(last30Days.getDate() - 30);

        const effectiveStart = startDate < last30Days ? startDate : last30Days;
        const effectiveEnd = endDate > now ? endDate : now;

        // Fetch sales
        let query = client
            .from('sales')
            .select(`
                id,
                total, 
                created_at, 
                payment_method,
                staff:admins!inner(shop_id),
                sale_items(
                    product_name, 
                    quantity, 
                    subtotal,
                    products(
                        cost,
                        categories(name)
                    )
                )
            `)
            .eq('status', 'completed')
            .gte('created_at', effectiveStart.toISOString())
            .lte('created_at', effectiveEnd.toISOString());

        if (shopId) {
            query = query.eq('staff.shop_id', shopId);
        }

        const { data: allPeriodSales, error } = await query;

        if (error) throw error;

        // Total Lifetime Sales
        let totalSalesQuery = client
            .from('sales')
            .select('total, staff:admins!inner(shop_id)', { count: 'exact' })
            .eq('status', 'completed');

        if (shopId) {
            totalSalesQuery = totalSalesQuery.eq('staff.shop_id', shopId);
        }

        const { count: totalBillCount, data: totalSalesAgg } = await totalSalesQuery;
        const totalSalesAmount = totalSalesAgg?.reduce((sum, s) => sum + (Number(s.total) || 0), 0) || 0;

        // 4. In-Memory Processing
        let todayAmount = 0;
        let todayBillCount = 0;
        let todayCost = 0;
        let yesterdayAmount = 0;
        let yesterdayBillCount = 0;
        let yesterdayCost = 0;
        let totalCostAmount = 0;

        const paymentMap = new Map<string, { total: number, count: number }>();
        const productMap = new Map<string, { productName: string, totalQty: number, totalAmount: number }>();
        const categoryMap = new Map<string, { category: string, totalQty: number, totalAmount: number }>();

        // chartData buckets
        const chartBuckets = new Map<string, { total: number, cost: number, profit: number }>();
        if (viewType === 'daily') {
            const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) chartBuckets.set(`${i}/${currentMonth}`, { total: 0, cost: 0, profit: 0 });
        } else {
            for (let i = 1; i <= 12; i++) chartBuckets.set(`${i}/${currentYear}`, { total: 0, cost: 0, profit: 0 });
        }

        allPeriodSales?.forEach(sale => {
            const saleDate = new Date(sale.created_at);
            const saleTotal = Number(sale.total) || 0;
            const isToday = saleDate >= today;
            const isYesterday = saleDate >= yesterday && saleDate < today;
            const isLast30Days = saleDate >= last30Days;

            // Header Stats & Today/Yesterday
            if (isToday) {
                todayAmount += saleTotal;
                todayBillCount++;
            } else if (isYesterday) {
                yesterdayAmount += saleTotal;
                yesterdayBillCount++;
            }

            // Payment Stats (Last 30 Days)
            if (isLast30Days) {
                const method = sale.payment_method || 'other';
                const p = paymentMap.get(method) || { total: 0, count: 0 };
                p.total += saleTotal;
                p.count++;
                paymentMap.set(method, p);
            }

            // Chart Data Mapping
            let bucketKey: string;
            if (viewType === 'daily') {
                if (saleDate.getFullYear() === currentYear && (saleDate.getMonth() + 1) === currentMonth) {
                    bucketKey = `${saleDate.getDate()}/${currentMonth}`;
                }
            } else {
                if (saleDate.getFullYear() === currentYear) {
                    bucketKey = `${saleDate.getMonth() + 1}/${currentYear}`;
                }
            }

            const items = sale.sale_items as any[];
            items?.forEach(item => {
                const qty = Number(item.quantity) || 0;
                const subtotal = Number(item.subtotal) || 0;
                const costPerUnit = Number(item.products?.cost) || 0;
                const itemsCost = qty * costPerUnit;

                if (isToday) todayCost += itemsCost;
                if (isYesterday) yesterdayCost += itemsCost;
                totalCostAmount += itemsCost; // This should technically be for the last 30 days if following original logic, but here we cover the fetched period

                // Chart aggregation
                if (bucketKey) {
                    const b = chartBuckets.get(bucketKey);
                    if (b) {
                        b.total += subtotal;
                        b.cost += itemsCost;
                        b.profit = b.total - b.cost;
                    }
                }

                // Top Selling (Last 30 Days)
                if (isLast30Days) {
                    const name = item.product_name;
                    const p = productMap.get(name) || { productName: name, totalQty: 0, totalAmount: 0 };
                    p.totalQty += qty;
                    p.totalAmount += subtotal;
                    productMap.set(name, p);

                    const catName = item.products?.categories?.name || 'อื่นๆ';
                    const c = categoryMap.get(catName) || { category: catName, totalQty: 0, totalAmount: 0 };
                    c.totalQty += qty;
                    c.totalAmount += subtotal;
                    categoryMap.set(catName, c);
                }
            });
        });

        // 5. Finalize Results
        let growthRate = 0;
        if (yesterdayAmount > 0) growthRate = ((todayAmount - yesterdayAmount) / yesterdayAmount) * 100;
        else if (todayAmount > 0) growthRate = 100;

        const chartData = Array.from(chartBuckets.entries()).map(([date, data]) => ({ date, ...data }));
        const paymentStats = Array.from(paymentMap.entries()).map(([paymentMethod, stats]) => ({ paymentMethod, ...stats })).sort((a, b) => b.total - a.total);
        const topSellingProducts = Array.from(productMap.values()).sort((a, b) => b.totalQty - a.totalQty).slice(0, 5);
        const topSellingCategories = Array.from(categoryMap.values()).sort((a, b) => b.totalQty - a.totalQty).slice(0, 5);

        return {
            dashboardData: {
                totalSales: totalSalesAmount,
                totalProfit: totalSalesAmount - totalCostAmount,
                totalCost: totalCostAmount,
                billCount: totalBillCount || 0
            },
            todaySales: {
                date: today,
                totalAmount: todayAmount,
                totalCost: todayCost,
                totalProfit: todayAmount - todayCost,
                billCount: todayBillCount,
                averagePerBill: todayBillCount > 0 ? todayAmount / todayBillCount : 0,
                growthRate,
                yesterdayTotal: yesterdayAmount,
                yesterdayBillCount: yesterdayBillCount,
                yesterdayAveragePerBill: yesterdayBillCount > 0 ? yesterdayAmount / yesterdayBillCount : 0,
                topProducts: topSellingProducts,
                hourlyData: []
            },
            chartData,
            paymentStats,
            topSellingProducts,
            topSellingCategories
        };
    }

    async getProductSalesStats(
        dateRange: string = 'today',
        shopId?: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<{
        data: Array<{
            id: number;
            barcode: string;
            name: string;
            soldQty: number;
            totalAmount: number;
            netProfit: number;
        }>;
        total: number;
        limit: number;
        offset: number;
        nextPage: number | null;
    }> {
        const client = this.supabaseService.getClient();
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Calculate date range
        let startDate: Date;
        let endDate: Date = now;

        switch (dateRange) {
            case 'today':
                startDate = startOfDay;
                break;
            case 'yesterday': {
                const yesterdayStart = new Date(startOfDay);
                yesterdayStart.setDate(yesterdayStart.getDate() - 1);
                startDate = yesterdayStart;
                endDate = startOfDay;
                break;
            }
            case 'last7days': {
                const last7Days = new Date(startOfDay);
                last7Days.setDate(last7Days.getDate() - 7);
                startDate = last7Days;
                break;
            }
            case 'last30days': {
                const last30Days = new Date(startOfDay);
                last30Days.setDate(last30Days.getDate() - 30);
                startDate = last30Days;
                break;
            }
            default:
                startDate = startOfDay;
        }

        // Fetch completed sales with items and product info
        let query = client
            .from('sales')
            .select(`
                id,
                created_at,
                staff:admins!inner(shop_id),
                sale_items(
                    product_id,
                    product_name,
                    quantity,
                    subtotal,
                    products(
                        id,
                        barcode,
                        name,
                        cost
                    )
                )
            `)
            .eq('status', 'completed')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (shopId) {
            query = query.eq('staff.shop_id', shopId);
        }

        const { data: sales, error } = await query;

        if (error) {
            console.error('Error fetching product sales stats:', error);
            return { data: [], total: 0, limit, offset, nextPage: null };
        }

        // Aggregate product stats
        const statsMap = new Map<number, {
            id: number;
            barcode: string;
            name: string;
            soldQty: number;
            totalAmount: number;
            netProfit: number;
        }>();

        (sales || []).forEach((sale: any) => {
            const items = sale.sale_items || [];
            items.forEach((item: any) => {
                const productId = item.product_id;
                const product = item.products;

                if (!statsMap.has(productId)) {
                    statsMap.set(productId, {
                        id: productId,
                        barcode: product?.barcode || '-',
                        name: item.product_name || product?.name || 'Unknown',
                        soldQty: 0,
                        totalAmount: 0,
                        netProfit: 0
                    });
                }

                const stat = statsMap.get(productId)!;
                const qty = Number(item.quantity) || 0;
                const amount = Number(item.subtotal) || 0;
                const cost = Number(product?.cost) || 0;

                stat.soldQty += qty;
                stat.totalAmount += amount;
                stat.netProfit += amount - (cost * qty);
            });
        });

        // Convert to sorted array (by totalAmount desc)
        const allProducts = Array.from(statsMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
        const total = allProducts.length;

        // Apply pagination
        const paginatedData = allProducts.slice(offset, offset + limit);
        const hasNext = offset + limit < total;

        return {
            data: paginatedData,
            total,
            limit,
            offset,
            nextPage: hasNext ? offset + limit : null
        };
    }

    private mapToSale(data: Record<string, unknown>): Sale {
        const items = (data.sale_items as Array<Record<string, unknown>> || []).map((item) => ({
            id: item.id as number,
            productId: item.product_id as number,
            productName: item.product_name as string,
            price: item.price as number,
            quantity: item.quantity as number,
            subtotal: item.subtotal as number,
        }));

        return {
            id: data.id as number,
            billNumber: data.bill_number as string,
            customerId: data.customer_id as number,
            items,
            subtotal: data.subtotal as number,
            discount: data.discount as number,
            total: data.total as number,
            paymentMethod: data.payment_method as 'cash' | 'card' | 'qr' | 'transfer' | 'scan' | 'promptpay',
            amountReceived: data.amount_received as number,
            changeAmount: data.change_amount as number,
            status: data.status as 'completed' | 'held' | 'cancelled',
            couponCode: data.coupon_code as string | null,
            createdAt: new Date(data.created_at as string),
            updatedAt: new Date(data.updated_at as string),
            customer: data.customers,
            staff: data.staff,
        };
    }
}
