import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { StaffLogsService } from './staff-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('staff-logs')
@UseGuards(JwtAuthGuard)
export class StaffLogsController {
    constructor(private readonly staffLogsService: StaffLogsService) { }

    @Get()
    @UseGuards(RolesGuard)
    @Roles('admin')
    async findAll(
        @Query() paginationDto: PaginationDto,
        @Query('staffId') staffId?: string,
        @Query('action') action?: string,
        @Req() req?: any
    ) {
        return this.staffLogsService.findAll(
            paginationDto,
            staffId ? +staffId : undefined,
            action,
            req?.user?.shopId
        );
    }
}
