import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, UseGuards, Req, Query } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { CreateRewardDto, UpdateRewardDto, RedeemRewardDto } from './dto/reward.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('rewards')
export class RewardsController {
    constructor(private readonly rewardsService: RewardsService) { }

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    findAll(@Query() paginationDto: PaginationDto, @Query('shopId') queryShopId?: string, @Req() req?: any) {
        const userShopId = req?.user?.shopId;
        const shopId = userShopId || queryShopId;

        if (!shopId) throw new HttpException('Shop ID is required', HttpStatus.BAD_REQUEST);

        return this.rewardsService.findPaginated(paginationDto, shopId);
    }

    @Get('active')
    @UseGuards(OptionalJwtAuthGuard)
    findActive(@Query('shopId') queryShopId?: string, @Req() req?: any) {
        const userShopId = req?.user?.shopId;
        const shopId = userShopId || queryShopId;

        if (!shopId) throw new HttpException('Shop ID is required', HttpStatus.BAD_REQUEST);

        return this.rewardsService.findActive(shopId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const reward = await this.rewardsService.findOne(+id);
        if (!reward) throw new HttpException('Reward not found', HttpStatus.NOT_FOUND);
        return reward;
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    create(@Req() req, @Body() createRewardDto: CreateRewardDto) {
        return this.rewardsService.create(createRewardDto, req.user.userId, req.user.shopId);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async update(@Req() req, @Param('id') id: string, @Body() updateRewardDto: UpdateRewardDto) {
        const reward = await this.rewardsService.update(+id, updateRewardDto, req.user.userId);
        if (!reward) throw new HttpException('Reward not found', HttpStatus.NOT_FOUND);
        return reward;
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async delete(@Req() req, @Param('id') id: string) {
        const success = await this.rewardsService.delete(+id, req.user.userId);
        if (!success) throw new HttpException('Reward not found', HttpStatus.NOT_FOUND);
        return { message: 'Reward deleted' };
    }

    @Post('redeem')
    @UseGuards(JwtAuthGuard)
    async redeem(@Req() req, @Body() redeemDto: RedeemRewardDto) {
        const redemption = await this.rewardsService.redeem(redeemDto, req.user.userId);
        if (!redemption) throw new HttpException('Redemption failed', HttpStatus.BAD_REQUEST);
        return redemption;
    }

    @Get('redemptions/:customerId')
    @UseGuards(JwtAuthGuard)
    getRedemptions(@Param('customerId') customerId: string) {
        return this.rewardsService.getRedemptionsByCustomer(+customerId);
    }
}
