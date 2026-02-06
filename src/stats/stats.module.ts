import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { SalesModule } from '../sales/sales.module';

@Module({
    imports: [SupabaseModule, SalesModule],
    controllers: [StatsController],
    providers: [StatsService],
})
export class StatsModule { }
