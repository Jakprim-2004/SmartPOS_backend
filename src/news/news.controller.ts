import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, UseGuards, Req, Query } from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('news')
export class NewsController {
    constructor(private readonly newsService: NewsService) { }

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    findAll(@Query() paginationDto: PaginationDto, @Query('shopId') queryShopId?: string, @Req() req?: any) {
        const userShopId = req?.user?.shopId;
        const shopId = userShopId || queryShopId;

        if (!shopId) throw new HttpException('Shop ID is required', HttpStatus.BAD_REQUEST);

        return this.newsService.findPaginated(paginationDto, shopId);
    }

    @Get('published')
    @UseGuards(OptionalJwtAuthGuard)
    findPublished(@Query('shopId') queryShopId?: string, @Req() req?: any) {
        const userShopId = req?.user?.shopId;
        const shopId = userShopId || queryShopId;

        if (!shopId) throw new HttpException('Shop ID is required', HttpStatus.BAD_REQUEST);

        return this.newsService.findPublished(shopId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const news = await this.newsService.findOne(+id);
        if (!news) throw new HttpException('News not found', HttpStatus.NOT_FOUND);
        return news;
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    create(@Req() req, @Body() dto: CreateNewsDto) {
        return this.newsService.create(dto, req.user.userId, req.user.shopId);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async update(@Req() req, @Param('id') id: string, @Body() dto: UpdateNewsDto) {
        const news = await this.newsService.update(+id, dto, req.user.userId);
        if (!news) throw new HttpException('News not found', HttpStatus.NOT_FOUND);
        return news;
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async delete(@Req() req, @Param('id') id: string) {
        if (!await this.newsService.delete(+id, req.user.userId)) throw new HttpException('News not found', HttpStatus.NOT_FOUND);
        return { message: 'Deleted' };
    }
}
