import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe, Req, Query, HttpException, HttpStatus } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    findAll(@Query('shopId') queryShopId?: string, @Req() req?: any) {
        // Strict shop filtering
        const userShopId = req?.user?.shopId;
        const shopId = userShopId || queryShopId;

        if (!shopId) throw new HttpException('Shop ID is required', HttpStatus.BAD_REQUEST);

        return this.categoriesService.findAll(shopId);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard) // Added Guards here
    @Roles('admin', 'staff')
    create(@Req() req, @Body() dto: CreateCategoryDto) {
        return this.categoriesService.create(dto, req.user.userId, req.user.shopId);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard) // Added Guards here
    @Roles('admin', 'staff')
    update(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
        return this.categoriesService.update(id, dto, req.user.userId);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard) // Added Guards here
    @Roles('admin')
    delete(@Req() req, @Param('id', ParseIntPipe) id: number) {
        return this.categoriesService.delete(id, req.user.userId);
    }
}
