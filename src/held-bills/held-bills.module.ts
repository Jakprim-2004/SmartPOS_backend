import { Module } from '@nestjs/common';
import { HeldBillsService } from './held-bills.service';
import { HeldBillsController } from './held-bills.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    controllers: [HeldBillsController],
    providers: [HeldBillsService],
})
export class HeldBillsModule { }
