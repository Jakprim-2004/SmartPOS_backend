import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateProductDto {
    @IsString()
    name: string;

    @IsNumber()
    price: number;

    @IsNumber()
    cost: number;

    @IsNumber()
    categoryId: number;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsNumber()
    stock: number;

    @IsOptional()
    @IsString()
    barcode?: string;

    @IsOptional()
    @IsNumber()
    createdBy?: number;
}

export class UpdateProductDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsNumber()
    price?: number;

    @IsOptional()
    @IsNumber()
    cost?: number;

    @IsOptional()
    @IsNumber()
    categoryId?: number;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsNumber()
    stock?: number;

    @IsOptional()
    @IsString()
    barcode?: string;
}
