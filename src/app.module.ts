import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { RewardsModule } from './rewards/rewards.module';
import { PromotionsModule } from './promotions/promotions.module';
import { CouponsModule } from './coupons/coupons.module';
import { NewsModule } from './news/news.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { CategoriesModule } from './categories/categories.module';
import { StatsModule } from './stats/stats.module';
import { HeldBillsModule } from './held-bills/held-bills.module';
import { CartModule } from './cart/cart.module';
import { StaffModule } from './staff/staff.module';
import { StaffLogsModule } from './staff-logs/staff-logs.module';

import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global Rate Limit: 100 requests per 60 seconds
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    SupabaseModule,
    AuthModule,
    CustomersModule,
    ProductsModule,
    SalesModule,
    RewardsModule,
    PromotionsModule,
    CouponsModule,
    NewsModule,
    SettingsModule,
    CategoriesModule,
    StatsModule,
    HeldBillsModule,
    CartModule,
    StaffModule,
    StaffLogsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
