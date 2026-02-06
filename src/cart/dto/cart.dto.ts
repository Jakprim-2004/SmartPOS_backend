import { IsNumber, IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CartItemDto {
    @IsNumber()
    productId: number;

    @IsNumber()
    quantity: number;
}

export class UpdateCartDto {
    @IsOptional()
    @IsNumber()
    customerId?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CartItemDto)
    items: CartItemDto[];
}
