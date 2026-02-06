import { IsNumber, IsString, IsArray, IsOptional, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class SaleItemDto {
    @IsNumber()
    productId: number;

    @IsString()
    productName: string;

    @IsNumber()
    price: number;

    @IsNumber()
    quantity: number;
}

export class CreateSaleDto {
    @IsOptional()
    @IsNumber()
    customerId?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SaleItemDto)
    items: SaleItemDto[];

    @IsNumber()
    subtotal: number;

    @IsNumber()
    discount: number;

    @IsNumber()
    total: number;

    @IsString()
    @IsIn(['cash', 'card', 'qr', 'transfer', 'scan', 'promptpay'])
    paymentMethod: 'cash' | 'card' | 'qr' | 'transfer' | 'scan' | 'promptpay';

    @IsOptional()
    @IsNumber()
    amountReceived?: number;

    @IsOptional()
    @IsNumber()
    changeAmount?: number;

    @IsOptional()
    @IsNumber()
    pointsRedeemed?: number;

    @IsOptional()
    @IsString()
    @IsIn(['completed', 'held', 'cancelled'])
    status?: 'completed' | 'held' | 'cancelled';

    @IsOptional()
    @IsNumber()
    staffId?: number;

    @IsOptional()
    @IsString()
    couponCode?: string;
}

export class UpdateSaleDto {
    @IsOptional()
    @IsNumber()
    customerId?: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SaleItemDto)
    items?: SaleItemDto[];

    @IsOptional()
    @IsNumber()
    subtotal?: number;

    @IsOptional()
    @IsNumber()
    discount?: number;

    @IsOptional()
    @IsNumber()
    total?: number;

    @IsOptional()
    @IsString()
    @IsIn(['cash', 'card', 'qr', 'transfer', 'scan', 'promptpay'])
    paymentMethod?: 'cash' | 'card' | 'qr' | 'transfer' | 'scan' | 'promptpay';

    @IsOptional()
    @IsNumber()
    amountReceived?: number;

    @IsOptional()
    @IsNumber()
    changeAmount?: number;

    @IsOptional()
    @IsNumber()
    pointsRedeemed?: number;

    @IsOptional()
    @IsString()
    @IsIn(['completed', 'held', 'cancelled'])
    status?: 'completed' | 'held' | 'cancelled';
}
