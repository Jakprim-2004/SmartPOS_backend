import { IsNumber, IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class HeldBillItemDto {
    @IsNumber()
    productId: number;

    @IsString()
    productName: string;

    @IsNumber()
    price: number;

    @IsNumber()
    quantity: number;
}

export class CreateHeldBillDto {
    @IsOptional()
    @IsNumber()
    customerId?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => HeldBillItemDto)
    items: HeldBillItemDto[];

    @IsNumber()
    subtotal: number;

    @IsNumber()
    discount: number;

    @IsNumber()
    total: number;

    @IsOptional()
    @IsString()
    notes?: string;
}
