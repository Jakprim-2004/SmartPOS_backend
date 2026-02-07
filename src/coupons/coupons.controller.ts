import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, UseGuards, Query, Req } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto/coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('coupons')
export class CouponsController {
    constructor(private readonly couponsService: CouponsService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    findAll(
        @Query('search') search?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('page') page?: string,
        @Req() req?: any
    ) {
        const shopId = req.user.shopId;
        if (!shopId) throw new HttpException('Shop ID is required', HttpStatus.BAD_REQUEST);

        const paginationDto: PaginationDto = {};
        const limitNum = limit ? parseInt(limit, 10) : undefined;
        let offsetNum = offset !== undefined ? parseInt(offset, 10) : undefined;

        if (offsetNum === undefined && page && limitNum !== undefined) {
            const pageNum = parseInt(page, 10);
            if (!isNaN(pageNum) && pageNum > 0) {
                offsetNum = (pageNum - 1) * limitNum;
            }
        }

        if (limitNum !== undefined) paginationDto.limit = limitNum;
        if (offsetNum !== undefined) paginationDto.offset = offsetNum;

        return this.couponsService.findPaginated(
            paginationDto,
            search,
            shopId
        );
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const coupon = await this.couponsService.findOne(+id);
        if (!coupon) throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);
        return coupon;
    }

    @Get('code/:code')
    @UseGuards(OptionalJwtAuthGuard)
    async findByCode(@Param('code') code: string, @Query('shopId') queryShopId?: string, @Req() req?: any) {
        const shopId = req?.user?.shopId || queryShopId;
        if (!shopId) throw new HttpException('Shop ID is required', HttpStatus.BAD_REQUEST);

        const coupon = await this.couponsService.findByCode(code, shopId);
        if (!coupon) throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);
        return coupon;
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async create(@Body() dto: CreateCouponDto, @Req() req: any) {
        return this.couponsService.create(dto, req.user.shopId);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
        const coupon = await this.couponsService.update(+id, dto);
        if (!coupon) throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);
        return coupon;
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async delete(@Param('id') id: string) {
        if (!await this.couponsService.delete(+id)) throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);
        return { message: 'Deleted' };
    }

    @Post('validate')
    async validate(@Body() dto: ValidateCouponDto, @Query('shopId') shopId?: string) {
        if (!shopId) throw new HttpException('Shop ID is required', HttpStatus.BAD_REQUEST);
        return this.couponsService.validate(dto, shopId);
    }

    @Post('use/:code')
    @UseGuards(JwtAuthGuard)
    async useCoupon(@Param('code') code: string, @Query('shopId') queryShopId?: string, @Req() req?: any) {
        const shopId = req?.user?.shopId || queryShopId;
        if (!shopId) throw new HttpException('Shop ID is required', HttpStatus.BAD_REQUEST);

        if (!await this.couponsService.useCoupon(code, shopId)) throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);
        return { message: 'Coupon used' };
    }
}
