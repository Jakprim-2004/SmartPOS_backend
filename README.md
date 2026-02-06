# 🛠️ Smart POS Cloud - Backend (NestJS)

ระบบหลังบ้าน (API) ประสิทธิภาพสูงสำหรับ Smart POS Cloud พัฒนาด้วย NestJS พร้อมการเชื่อมต่อฐานข้อมูล Supabase และระบบรักษาความปลอดภัยด้วย JWT

## 🌟 คุณสมบัติ (Features)

- **RESTful API**: ให้บริการข้อมูลสำหรับระบบ POS ทั้งหมด
- **Authentication**: ระบบล็อกอินและจัดการสิทธิ์ด้วย JWT (Json Web Token) และ HttpOnly Cookies
- **Supabase Integration**: เชื่อมต่อฐานข้อมูล PostgreSQL ผ่าน Supabase Client
- **Security & CORS**: ตั้งค่าความปลอดภัยรองรับการเชื่อมต่อข้ามโดเมน (Vercel)
- **Validation**: ตรวจสอบความถูกต้องของข้อมูลผ่าน DTO และ ValidationPipe

## 🛠 เทคโนโลยีที่ใช้ (Tech Stack)

- **Framework**: [NestJS](https://nestjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Supabase (PostgreSQL)](https://supabase.com/)
- **Authentication**: [@nestjs/jwt](https://docs.nestjs.com/security/authentication), [Passport](https://www.passportjs.org/)
- **Tools**: Bun (Lockfile), Prettier, ESLint

## 🌐 ลิงก์ระบบ (Production Links)

- **API Base URL**: [https://smartpos-backend-7ee9.onrender.com/api](https://smartpos-backend-7ee9.onrender.com/api)
- **Frontend App**: [https://smart-pos-frontend-gamma.vercel.app/](https://smart-pos-frontend-gamma.vercel.app/)

## ⚙️ การตั้งค่าระบบ (Environment Variables)

สร้างไฟล์ `.env` ในโฟลเดอร์ `backend_Nest/smartpos_nest` และกำหนดค่าดังนี้:

```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_or_anon_key
JWT_SECRET=your_secret_key_for_jwt
```

## 🚀 การรันโปรเจกต์ในเครื่อง (Local Development)

1. ติดตั้ง Dependencies:
   ```bash
   npm install
   ```

2. รันโหมด Development (Watch Mode):
   ```bash
   npm run start:dev
   ```

3. API จะทำงานที่: `http://localhost:3001/api`

## 📁 โครงสร้างโปรเจกต์

- `/src/auth`: ระบบยืนยันตัวตนและการจัดการสิทธิ์
- `/src/supabase`: บริการเชื่อมต่อกับฐานข้อมูล Supabase
- `/src/common`: ฟิลเตอร์กรองข้อผิดพลาดและ Utilities ต่างๆ
- `/src/products, /src/sales, etc.`: โมดูลแยกตามฟังก์ชันธุรกิจ

---
**Secured by Smart POS Cloud Team**
