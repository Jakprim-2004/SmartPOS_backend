import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto } from '../auth/dto/staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    @Get()
    @UseGuards(RolesGuard)
    @Roles('admin')
    findAll(@Query() paginationDto: PaginationDto, @Req() req) {
        return this.staffService.findPaginated(paginationDto, req.user.shopId);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles('admin')
    create(@Req() req, @Body() dto: CreateStaffDto) {
        return this.staffService.create(req.user.userId, dto, req.user.shopId);
    }

    @Put(':id')
    @UseGuards(RolesGuard)
    @Roles('admin')
    update(@Req() req, @Param('id') id: string, @Body() dto: UpdateStaffDto) {
        return this.staffService.update(req.user.userId, +id, dto, req.user.shopId);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles('admin')
    remove(@Req() req, @Param('id') id: string) {
        return this.staffService.delete(req.user.userId, +id, req.user.shopId);
    }
}
