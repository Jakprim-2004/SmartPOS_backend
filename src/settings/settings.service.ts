import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
    constructor(private readonly supabase: SupabaseService) { }

    async getSettings(shopId?: string) {
        let query = this.supabase.getClient()
            .from('store_settings')
            .select('*')
            .limit(1);

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error } = await query.single();

        if (error) return null;
        return this.mapToDto(data);
    }

    async updateSettings(dto: UpdateSettingsDto, shopId?: string) {
        const updateData: any = {};
        if (dto.name) updateData.name = dto.name;
        if (dto.address) updateData.address = dto.address;
        if (dto.phone) updateData.phone = dto.phone;
        if (dto.taxId) updateData.tax_id = dto.taxId;
        if (dto.logoUrl) updateData.logo_url = dto.logoUrl;
        if (dto.promptpayNumber) updateData.promptpay_number = dto.promptpayNumber;
        if (dto.promptpayName) updateData.promptpay_name = dto.promptpayName;
        updateData.updated_at = new Date();

        const current = await this.getSettings(shopId);
        let query;

        if (!current) {
            if (shopId) updateData.shop_id = shopId;
            query = this.supabase.getClient().from('store_settings').insert([updateData]);
        } else {
            query = this.supabase.getClient().from('store_settings').update(updateData).eq('id', current.id);
        }

        const { data, error } = await query.select().single();
        if (error) throw error;
        return this.mapToDto(data);
    }

    private mapToDto(data: any) {
        if (!data) return null;
        return {
            id: data.id,
            name: data.name,
            address: data.address,
            phone: data.phone,
            taxId: data.tax_id,
            logoUrl: data.logo_url,
            promptpayNumber: data.promptpay_number,
            promptpayName: data.promptpay_name,
            updatedAt: data.updated_at
        };
    }
}
