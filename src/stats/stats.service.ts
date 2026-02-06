import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SalesService } from '../sales/sales.service';

@Injectable()
export class StatsService {
    constructor(
        private readonly supabase: SupabaseService,
        private readonly salesService: SalesService
    ) { }

    async getDashboardStats(shopId?: string) {
        const client = this.supabase.getClient();
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        // 1. Get Sales, Cost, Profit for current month using the optimized SalesService
        const salesStats = await this.salesService.getDashboardStats('daily', year, month, shopId);

        // Aggregate totals for the month from chartData
        const monthlyTotalSales = salesStats.chartData.reduce((sum, d) => sum + (d.total || 0), 0);
        const monthlyTotalCost = salesStats.chartData.reduce((sum, d) => sum + (d.cost || 0), 0);
        const monthlyTotalProfit = monthlyTotalSales - monthlyTotalCost;

        // 2. Total Customers
        let customerQuery = client
            .from('customers')
            .select('*', { count: 'exact', head: true });

        if (shopId) customerQuery = customerQuery.eq('shop_id', shopId);

        const { count: customerCount } = await customerQuery;

        // 3. Active Promotions
        let promoQuery = client
            .from('promotions')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        if (shopId) promoQuery = promoQuery.eq('shop_id', shopId);

        const { count: promoCount } = await promoQuery;

        // 4. Coupons count
        let couponQuery = client
            .from('coupons')
            .select('*', { count: 'exact', head: true });

        if (shopId) couponQuery = couponQuery.eq('shop_id', shopId);

        const { count: couponCount } = await couponQuery;

        return {
            customerCount: customerCount || 0,
            promoCount: promoCount || 0,
            totalSales: monthlyTotalSales,
            totalCost: monthlyTotalCost,
            totalProfit: monthlyTotalProfit,
            couponCount: couponCount || 0,
            recentActivities: []
        };
    }
}
