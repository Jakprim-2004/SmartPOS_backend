import { Module, Global } from '@nestjs/common';
import { StaffLogsService } from './staff-logs.service';
import { StaffLogsController } from './staff-logs.controller';

@Global()
@Module({
    providers: [StaffLogsService],
    controllers: [StaffLogsController],
    exports: [StaffLogsService],
})
export class StaffLogsModule { }
