import { IsString, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    taxId?: string;

    @IsOptional()
    @IsString()
    logoUrl?: string;

    @IsOptional()
    @IsString()
    promptpayNumber?: string;

    @IsOptional()
    @IsString()
    promptpayName?: string;
}
