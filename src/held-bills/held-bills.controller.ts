import { Controller, Get, Post, Body, Param, Delete, HttpException, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { HeldBillsService } from './held-bills.service';
import { CreateHeldBillDto } from './dto/held-bill.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('held-bills')
@UseGuards(JwtAuthGuard)
export class HeldBillsController {
    constructor(private readonly heldBillsService: HeldBillsService) { }

    @Get()
    findAll(@Req() req: any) {
        return this.heldBillsService.findAll(req.user.shopId);
    }

    @Post()
    create(@Body() dto: CreateHeldBillDto, @Req() req: any) {
        return this.heldBillsService.create(dto, req.user.shopId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const bill = await this.heldBillsService.findOne(+id);
        if (!bill) throw new HttpException('Bill not found', HttpStatus.NOT_FOUND);
        return bill;
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        const success = await this.heldBillsService.delete(+id);
        if (!success) throw new HttpException('Failed to delete', HttpStatus.INTERNAL_SERVER_ERROR);
        return { success: true };
    }
}
