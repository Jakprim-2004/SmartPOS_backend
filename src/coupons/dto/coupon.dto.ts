import { IsString, IsOptional, IsNumber, IsBoolean, IsDateString } from 'class-validator';

export class CreateCouponDto {
    @IsString()
    code: string;

    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    discountType: 'percentage' | 'fixed';

    @IsNumber()
    discountValue: number;

    @IsNumber()
    @IsOptional()
    minPurchase?: number;

    @IsNumber()
    @IsOptional()
    maxUses?: number;

    @IsOptional()
    @IsString() // Use String for Date ISO from JSON
    startDate: string;

    @IsOptional()
    @IsString()
    endDate: string;
}

export class UpdateCouponDto {
    @IsString()
    @IsOptional()
    code?: string;

    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    discountType?: 'percentage' | 'fixed';

    @IsNumber()
    @IsOptional()
    discountValue?: number;

    @IsNumber()
    @IsOptional()
    minPurchase?: number;

    @IsNumber()
    @IsOptional()
    maxUses?: number;

    @IsString()
    @IsOptional()
    startDate?: string;

    @IsString()
    @IsOptional()
    endDate?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class ValidateCouponDto {
    @IsString()
    code: string;

    @IsNumber()
    purchaseAmount: number;
}
