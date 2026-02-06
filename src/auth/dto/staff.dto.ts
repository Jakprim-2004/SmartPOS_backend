import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateStaffDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsOptional()
    @IsString()
    shop_name?: string;
}

export class UpdateStaffDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    password?: string;

    @IsOptional()
    @IsString()
    shop_name?: string;
}
