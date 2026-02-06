import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    HttpException,
    HttpStatus,
    UseGuards,
    Req
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, MemberLoginDto } from './dto/customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('customers')
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    @Get()
    @UseGuards(JwtAuthGuard) // Strict checking for list
    async findAll(
        @Query() paginationDto: PaginationDto,
        @Query('search') search?: string,
        @Query('shopId') queryShopId?: string,
        @Req() req?: any
    ) {
        const userShopId = req?.user?.shopId;
        const shopId = userShopId || queryShopId;

        if (search) {
            return await this.customersService.search(search || '', shopId);
        }
        return await this.customersService.findAll(paginationDto, shopId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        // ... (unchanged)
        const customer = await this.customersService.findOne(+id);
        if (!customer) throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
        return customer;
    }

    @Get('phone/:phone')
    async findByPhone(@Param('phone') phone: string) {
        // ... (unchanged)
        const customer = await this.customersService.findByPhone(phone);
        if (!customer) throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
        return customer;
    }

    @Post('login')
    async login(@Body() body: MemberLoginDto) {
        // ... (unchanged)
        const customer = await this.customersService.login(body.phone, body.birthday);
        if (!customer) throw new HttpException('ข้อมูลไม่ถูกต้อง', HttpStatus.UNAUTHORIZED);
        return customer;
    }

    @Post()
    @UseGuards(OptionalJwtAuthGuard) // Allow Token (Admin) or Body (Member)
    async create(@Body() createCustomerDto: CreateCustomerDto, @Req() req: any) {
        try {
            const shopId = req?.user?.shopId || (createCustomerDto as any).shopId;
            // Validate? Service handles it?
            // If shopId missing? Customer becomes global?
            // Service line 99: if (shopId) insertData.shop_id = shopId;
            // Should we force shopId?
            // POS System -> Customer MUST belong to a shop?
            // Ideally yes.
            // But let's allow service to decide or just pass it.
            // Main fix is getting it from Token.
            return await this.customersService.create(createCustomerDto, shopId);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    async update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
        const customer = await this.customersService.update(+id, updateCustomerDto);
        if (!customer) {
            throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
        }
        return customer;
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async delete(@Param('id') id: string) {
        const success = await this.customersService.delete(+id);
        if (!success) {
            throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
        }
        return { message: 'Customer deleted successfully' };
    }
}
