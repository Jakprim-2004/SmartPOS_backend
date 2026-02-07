import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Req, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    async findAll(
        @Query('search') search?: string,
        @Query('categoryId') categoryId?: string,
        @Query('shopId') queryShopId?: string,
        @Query('stockStatus') stockStatus?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('page') page?: string,
        @Req() req?: any
    ) {
        const userShopId = req?.user?.shopId;
        const shopId = userShopId || queryShopId;

        if (!shopId) {
            throw new HttpException('Shop ID is required', HttpStatus.BAD_REQUEST);
        }

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

        // Always use paginated method to ensure consistent response structure { data, total }
        return this.productsService.findPaginated(
            paginationDto,
            search,
            categoryId ? parseInt(categoryId) : undefined,
            shopId,
            stockStatus
        );
    }

    @Get('stock/transactions')
    @UseGuards(JwtAuthGuard)
    getAllStockTransactions(@Req() req) {
        return this.productsService.getAllStockTransactions(req.user.shopId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        const product = this.productsService.findOne(+id);
        if (!product) {
            throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
        }
        return product;
    }

    @Get('barcode/:barcode')
    @UseGuards(OptionalJwtAuthGuard)
    findByBarcode(@Param('barcode') barcode: string, @Query('shopId') queryShopId?: string, @Req() req?: any) {
        const shopId = req?.user?.shopId || queryShopId;
        const product = this.productsService.findByBarcode(barcode, shopId);
        if (!product) {
            throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
        }
        return product;
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'staff')
    create(@Req() req, @Body() createProductDto: CreateProductDto) {
        return this.productsService.create({
            ...createProductDto,
            createdBy: req.user.userId
        }, req.user.shopId);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'staff')
    update(@Req() req, @Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
        const product = this.productsService.update(+id, updateProductDto, req.user.userId);
        if (!product) {
            throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
        }
        return product;
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    delete(@Req() req, @Param('id') id: string) {
        const success = this.productsService.delete(+id, req.user.userId);
        if (!success) {
            throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
        }
        return { message: 'Product deleted successfully' };
    }

    // Image Management
    @Get(':id/images')
    getImages(@Param('id') id: string) {
        return this.productsService.getImages(+id);
    }

    @Post(':id/images')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'staff')
    addImage(@Param('id') id: string, @Body() body: { url: string; isMain?: boolean }) {
        return this.productsService.addImage(+id, body.url, body.isMain);
    }

    @Delete('images/:imageId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'staff')
    removeImage(@Param('imageId') imageId: string) {
        return this.productsService.removeImage(+imageId);
    }

    @Patch(':id/images/:imageId/main')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'staff')
    setMainImage(@Param('id') id: string, @Param('imageId') imageId: string) {
        return this.productsService.setMainImage(+id, +imageId);
    }

    // Stock Management
    @Post(':id/stock')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'staff')
    addStock(@Req() req, @Param('id') id: string, @Body() body: { qty: number }) {
        return this.productsService.addStock(+id, body.qty, req.user.userId);
    }

    @Get(':id/stock/history')
    getStockHistory(@Param('id') id: string) {
        return this.productsService.getStockHistory(+id);
    }
}
