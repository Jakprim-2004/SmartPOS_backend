import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    Delete,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto, UpdateSaleDto } from './dto/sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Req, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('sales')
export class SalesController {
    constructor(private readonly salesService: SalesService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    async findAll(
        @Query() paginationDto: PaginationDto,
        @Query('status') status?: string,
        @Query('customerId') customerId?: string,
        @Query('search') search?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Req() req?: any
    ) {
        const shopId = req?.user?.shopId;

        return this.salesService.findAll(
            paginationDto,
            shopId,
            {
                status,
                customerId: customerId ? parseInt(customerId) : undefined,
                search,
                startDate,
                endDate
            }
        );
    }

    // Public endpoint for members to view their purchase history
    @Get('customer/:customerId')
    async findByCustomer(@Param('customerId') customerId: string) {
        // Member viewing their own history - maybe no shop restriction or filtered by Member's context if needed
        // But for now, let's keep it open or assume Member app handles it.
        // Or better: Filter by shopId if provided in query?
        // Actually this endpoint is specific for Member App which might query across shops?
        // Let's leave it as is for Member App for now.
        const data = await this.salesService.findByCustomer(+customerId);
        return { data, total: data.length };
    }

    @Get('summary')
    @UseGuards(JwtAuthGuard)
    getSummary(@Req() req) {
        return this.salesService.getSummary(req.user.shopId);
    }

    @Get('dashboard')
    @UseGuards(JwtAuthGuard)
    getDashboardStats(
        @Query('viewType') viewType?: string,
        @Query('year') year?: string,
        @Query('month') month?: string,
        @Req() req?: any
    ) {
        return this.salesService.getDashboardStats(
            viewType,
            year ? parseInt(year) : undefined,
            month ? parseInt(month) : undefined,
            req?.user?.shopId
        );
    }

    @Get('product-stats')
    @UseGuards(JwtAuthGuard)
    getProductSalesStats(
        @Query('dateRange') dateRange?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Req() req?: any
    ) {
        return this.salesService.getProductSalesStats(
            dateRange || 'today',
            req?.user?.shopId,
            limit ? parseInt(limit) : 50,
            offset ? parseInt(offset) : 0
        );
    }

    @Get('today')
    @UseGuards(JwtAuthGuard)
    getTodaySales(@Req() req) {
        return this.salesService.getTodaySales(req.user.shopId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const sale = await this.salesService.findOne(+id);
        if (!sale) {
            throw new HttpException('Sale not found', HttpStatus.NOT_FOUND);
        }
        return sale;
    }

    @Get('bill/:billNumber')
    async findByBillNumber(@Param('billNumber') billNumber: string) {
        const sale = await this.salesService.findByBillNumber(billNumber);
        if (!sale) {
            throw new HttpException('Sale not found', HttpStatus.NOT_FOUND);
        }
        return sale;
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Req() req, @Body() createSaleDto: CreateSaleDto) {
        return this.salesService.create({
            ...createSaleDto,
            staffId: req.user.userId
        }, req.user.shopName);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto) {
        const sale = await this.salesService.update(+id, updateSaleDto);
        if (!sale) {
            throw new HttpException('Sale not found', HttpStatus.NOT_FOUND);
        }
        return sale;
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async delete(@Param('id') id: string) {
        const success = await this.salesService.delete(+id);
        if (!success) {
            throw new HttpException('Failed to delete sale', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return { success: true };
    }
}
