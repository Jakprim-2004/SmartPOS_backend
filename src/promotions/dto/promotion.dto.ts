import { IsString, IsOptional, IsNumber, IsBoolean, IsIn } from 'class-validator';

export class CreatePromotionDto {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    image_url?: string;

    @IsOptional()
    @IsIn(['percentage', 'fixed_amount', 'buy_x_get_y'])
    discount_type?: 'percentage' | 'fixed_amount' | 'buy_x_get_y';

    @IsOptional()
    @IsNumber()
    discount_value?: number;

    @IsOptional()
    @IsString()
    start_date?: string;

    @IsOptional()
    @IsString()
    end_date?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}

export class UpdatePromotionDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    image_url?: string;

    @IsOptional()
    @IsIn(['percentage', 'fixed_amount', 'buy_x_get_y'])
    discount_type?: 'percentage' | 'fixed_amount' | 'buy_x_get_y';

    @IsOptional()
    @IsNumber()
    discount_value?: number;

    @IsOptional()
    @IsString()
    start_date?: string;

    @IsOptional()
    @IsString()
    end_date?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
