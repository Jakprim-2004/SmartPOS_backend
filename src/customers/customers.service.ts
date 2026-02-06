import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCustomerDto, UpdateCustomerDto, MemberLoginDto } from './dto/customer.dto';
import { Customer } from './interfaces/customer.interface';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CustomersService {
    constructor(private readonly supabaseService: SupabaseService) { }

    async findAll(paginationDto: PaginationDto, shopId?: string): Promise<{ data: Customer[], total: number, limit: number, offset: number, nextPage: number | null }> {
        const { limit = 10, offset = 0 } = paginationDto;
        const from = offset;
        const to = offset + limit - 1;

        let query = this.supabaseService
            .getClient()
            .from('customers')
            .select('*', { count: 'exact' });

        if (shopId) {
            query = query.eq('shop_id', shopId);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error fetching customers:', error);
            return { data: [], total: 0, limit, offset, nextPage: null };
        }

        const total = count || 0;
        const hasNext = offset + limit < total;

        return {
            data: data.map(this.mapToCustomer),
            total,
            limit,
            offset,
            nextPage: hasNext ? offset + limit : null
        };
    }

    async search(query: string, shopId?: string): Promise<{ data: Customer[], total: number }> {
        let dbQuery = this.supabaseService
            .getClient()
            .from('customers')
            .select('*', { count: 'exact' })
            .or(`name.ilike.%${query}%,phone.ilike.%${query}%`);

        if (shopId) {
            dbQuery = dbQuery.eq('shop_id', shopId);
        }

        const { data, error, count } = await dbQuery.order('created_at', { ascending: false });
        console.log(`[CustomersService] Search found: ${count} items`);

        if (error) return { data: [], total: 0 };
        return {
            data: (data || []).map(item => this.mapToCustomer(item)),
            total: count || 0
        };
    }

    async findOne(id: number): Promise<Customer | null> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return this.mapToCustomer(data);
    }

    async findByPhone(phone: string): Promise<Customer | null> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('customers')
            .select('*')
            .eq('phone', phone)
            .single();

        if (error) return null;
        return this.mapToCustomer(data);
    }

    async login(phone: string, birthday: string): Promise<Customer | null> {
        const customer = await this.findByPhone(phone);
        if (!customer) return null;
        if (customer.birthday === birthday) return customer;
        return null;
    }

    async create(createCustomerDto: CreateCustomerDto, shopId?: string): Promise<Customer> {
        console.log(`[CustomersService] Creating customer '${createCustomerDto.name}' for shopId: ${shopId}`);
        const insertData: any = {
            name: createCustomerDto.name,
            phone: createCustomerDto.phone,
            birthday: createCustomerDto.birthday,
            points: 0,
        };

        if (shopId) {
            insertData.shop_id = shopId;
        }

        const { data, error } = await this.supabaseService
            .getClient()
            .from('customers')
            .insert([insertData])
            .select()
            .single();

        if (error) {
            console.error('Error creating customer:', error);

            if (error.code === '23505') {
                throw new Error('เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว');
            }

            throw new Error(error.message || 'Failed to create customer');
        }

        return this.mapToCustomer(data);
    }

    async update(id: number, updateCustomerDto: UpdateCustomerDto): Promise<Customer | null> {
        const updateData: Record<string, unknown> = {};
        if (updateCustomerDto.name) updateData.name = updateCustomerDto.name;
        if (updateCustomerDto.phone) updateData.phone = updateCustomerDto.phone;
        if (updateCustomerDto.birthday) updateData.birthday = updateCustomerDto.birthday;
        if (updateCustomerDto.points !== undefined) updateData.points = updateCustomerDto.points;

        const { data, error } = await this.supabaseService
            .getClient()
            .from('customers')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) return null;
        return this.mapToCustomer(data);
    }

    async delete(id: number): Promise<boolean> {
        const { error } = await this.supabaseService
            .getClient()
            .from('customers')
            .delete()
            .eq('id', id);

        return !error;
    }

    private mapToCustomer(data: Record<string, unknown>): Customer {
        return {
            id: data.id as number,
            name: data.name as string,
            phone: data.phone as string,
            email: (data.email as string) || undefined,
            birthday: data.birthday as string,
            points: (data.points as number) || 0,
            totalSpent: (data.total_spent as number) || 0,
            shopId: data.shop_id as string,
            createdAt: new Date(data.created_at as string),
            updatedAt: data.updated_at ? new Date(data.updated_at as string) : new Date(data.created_at as string),
        };
    }
}
