import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, UseGuards, Query, Req } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PromotionProductsService } from './promotion-products.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('promotions')
export class PromotionsController {
    constructor(
        private readonly promotionsService: PromotionsService,
        private readonly promotionProductsService: PromotionProductsService
    ) { }

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    findAll(
        @Query() paginationDto: PaginationDto,
        @Query('search') search?: string,
        @Query('status') status?: string,
        @Query('shopId') queryShopId?: string,
        @Req() req?: any
    ) {
        const userShopId = req?.user?.shopId;
        const shopId = userShopId || queryShopId;

        if (!shopId) throw new HttpException('Shop ID is required', HttpStatus.BAD_REQUEST);

        return this.promotionsService.findPaginated(
            paginationDto,
            search,
            status,
            shopId
        );
    }

    @Get('active')
    @UseGuards(OptionalJwtAuthGuard)
    findActive(@Query('shopId') queryShopId?: string, @Req() req?: any) {
        // Allow public access via query or force admin shop
        const shopId = req?.user?.shopId || queryShopId;

        if (!shopId) throw new HttpException('Shop ID is required', HttpStatus.BAD_REQUEST);

        return this.promotionsService.findActive(shopId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const promo = await this.promotionsService.findOne(+id);
        if (!promo) throw new HttpException('Promotion not found', HttpStatus.NOT_FOUND);
        return promo;
    }

    @Get(':id/products')
    async getProducts(@Param('id') id: string) {
        return this.promotionProductsService.getProductsByPromotion(+id);
    }

    @Get('by-product/:productId')
    async getPromotionsByProduct(@Param('productId') productId: string) {
        return this.promotionProductsService.getPromotionsByProduct(+productId);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    create(@Body() body: any, @Req() req: any) {
        console.log('Controller received body:', JSON.stringify(body, null, 2));
        return this.promotionsService.create(body, req.user.shopId);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
        const promo = await this.promotionsService.update(+id, dto);
        if (!promo) throw new HttpException('Promotion not found', HttpStatus.NOT_FOUND);
        return promo;
    }

    @Put(':id/products')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async setProducts(@Param('id') id: string, @Body() body: { product_ids: number[] }) {
        await this.promotionProductsService.setProductsForPromotion(+id, body.product_ids);
        return { message: 'Products updated' };
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async delete(@Param('id') id: string) {
        if (!await this.promotionsService.delete(+id)) throw new HttpException('Promotion not found', HttpStatus.NOT_FOUND);
        return { message: 'Deleted' };
    }
}
