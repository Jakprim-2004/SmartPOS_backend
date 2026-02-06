import { Controller, Get, Post, Body, Delete, Query, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { UpdateCartDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
    constructor(private readonly cartService: CartService) { }

    @Get()
    getCart(@Query('staffId') staffId?: string) {
        return this.cartService.getCart(staffId);
    }

    @Post()
    updateCart(@Body() dto: UpdateCartDto, @Query('staffId') staffId?: string) {
        return this.cartService.updateCart(dto, staffId);
    }

    @Delete()
    clearCart(@Query('staffId') staffId?: string) {
        return this.cartService.clearCart(staffId);
    }
}
