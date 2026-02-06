import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return `
      <!DOCTYPE html>
      <html lang="th">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Smart POS Backend - Status</title>
          <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600&display=swap" rel="stylesheet">
          <style>
              body {
                  margin: 0;
                  padding: 0;
                  font-family: 'Kanit', sans-serif;
                  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                  height: 100vh;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  color: white;
              }
              .card {
                  background: rgba(255, 255, 255, 0.05);
                  backdrop-filter: blur(10px);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 24px;
                  padding: 40px;
                  text-align: center;
                  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                  max-width: 400px;
                  width: 90%;
              }
              .status-dot {
                  width: 12px;
                  height: 12px;
                  background-color: #10b981;
                  border-radius: 50%;
                  display: inline-block;
                  margin-right: 8px;
                  box-shadow: 0 0 10px #10b981;
                  animation: pulse 2s infinite;
              }
              @keyframes pulse {
                  0% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.2); opacity: 0.7; }
                  100% { transform: scale(1); opacity: 1; }
              }
              h1 { font-size: 24px; margin-bottom: 8px; font-weight: 600; }
              p { color: #94a3b8; margin-bottom: 24px; }
              .badge {
                  background: rgba(16, 185, 129, 0.1);
                  color: #10b981;
                  padding: 6px 16px;
                  border-radius: 99px;
                  font-size: 14px;
                  font-weight: 500;
              }
              .footer { margin-top: 32px; font-size: 12px; color: #64748b; }
          </style>
      </head>
      <body>
          <div class="card">
              <h1>🚀 Smart POS Backend</h1>
              <p>ระบบหลังบ้านเชื่อมต่อเรียบร้อยแล้ว</p>
              <div class="badge">
                  <span class="status-dot"></span>
                  Server is Active
              </div>
              <div class="footer">
                  Powering Smart POS Cloud • Version 1.0.0
              </div>
          </div>
      </body>
      </html>
    `;
  }
}
