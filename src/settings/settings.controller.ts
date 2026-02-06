import { Controller, Get, Put, Body, UseGuards, HttpException, HttpStatus, Req } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getSettings(@Req() req) {
        return await this.settingsService.getSettings(req.user.shopId);
    }

    @UseGuards(JwtAuthGuard)
    @Put()
    async updateSettings(@Body() dto: UpdateSettingsDto, @Req() req) {
        try {
            return await this.settingsService.updateSettings(dto, req.user.shopId);
        } catch (error) {
            throw new HttpException('Failed to update settings', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
