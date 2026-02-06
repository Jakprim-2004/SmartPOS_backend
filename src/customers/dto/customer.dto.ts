import { IsString, IsOptional, IsEmail, IsNumber } from 'class-validator';

export class CreateCustomerDto {
    @IsString()
    name: string;

    @IsString()
    phone: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    birthday?: string;
}

export class UpdateCustomerDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    birthday?: string;

    @IsOptional()
    @IsNumber()
    points?: number;

    @IsOptional()
    @IsNumber()
    totalSpent?: number;
}

export class MemberLoginDto {
    @IsString()
    phone: string;

    @IsString()
    birthday: string;
}
