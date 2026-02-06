import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
    private supabase: SupabaseClient;
    private readonly logger = new Logger(SupabaseService.name);

    constructor() {
        // ... existing constructor ...
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_KEY || '';

        if (!supabaseUrl || !supabaseKey) {
            this.logger.warn('Supabase URL or Key is missing. Check .env file.');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    async onModuleInit() {
        try {
            // Try to select from products table to check connection
            const { error } = await this.supabase.from('products').select('count');

            if (error) {
                // Check if error is related to missing table
                if (error.message.includes('Could not find the table') || error.code === '42P01') {
                    this.logger.warn('⚠️ Connected to Supabase, but "products" table not found. Please run the SQL schema migration.');
                } else if (error.code !== 'PGRST116') {
                    this.logger.error(`❌ Failed to connect to Supabase: ${error.message}`);
                }
            } else {
                this.logger.log('✅ Connected to Supabase products table successfully!');
            }
        } catch (e) {
            this.logger.error(`❌ Unexpected error checking Supabase connection: ${e.message}`);
        }
    }

    getClient(): SupabaseClient {
        return this.supabase;
    }
}
