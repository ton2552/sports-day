# 🏆 ระบบบันทึกและถ่ายทอดสดคะแนนกีฬาสี (Sports Day Live Scoreboard)

เว็บแอปพลิเคชันสำหรับบันทึกและถ่ายทอดผลการแข่งขันกีฬาสีแบบเรียลไทม์ พัฒนาด้วย **Python (FastAPI)** และรองรับการนำไปติดตั้งใช้งาน (Deploy) บน **Render.com** ได้ทันทีโดยไม่มีค่าใช้จ่าย!

---

## ✨ คุณสมบัติเด่น (Features)

- 🥇 **โพเดียมแสดง 3 อันดับแรก (Top 3 Podium):** ดีไซน์สไตล์ Futuristic Stadium พร้อมเหรียญทอง เงิน ทองแดง และมงกุฎสำหรับผู้นำ
- 📊 **ตารางสรุปเหรียญและคะแนนรวม (Live Scoreboard):** เรียงลำดับคะแนนรวมอัตโนมัติตามเหรียญทอง เหรียญเงิน เหรียญทองแดง พร้อมหลอดความคืบหน้า (Progress Bar)
- ⚡ **อัปเดตผลสดเรียลไทม์ (Live Auto-refresh):** มีระบบนับถอยหลังดึงข้อมูลล่าสุดอัตโนมัติทุก 10 วินาที เหมาะสำหรับเปิดขึ้นจอโปรเจกเตอร์หรือทีวีในโรงยิม/สนาม
- 🖥️ **โหมดจอใหญ่ / โปรเจกเตอร์ (Fullscreen Mode):** กดปุ่มเดียวเพื่อเข้าสู่โหมดเต็มจอ สำหรับฉายขึ้นจอขนาดใหญ่
- 📱 **ใช้งานสะดวกบนมือถือ (Mobile Friendly):** กรรมการสามารถถือสมาร์ตโฟนเดินบันทึกคะแนนข้างสนามได้ทันที
- 🔐 **ระบบป้องกันด้วยรหัสผ่าน PIN (Admin PIN Protection):** ผู้ชมทั่วไปสามารถดูผลได้อย่างเดียว ส่วนกรรมการ/ผู้ดูแลระบบต้องใส่รหัส PIN เพื่อเพิ่มหรือลบคะแนน
- 📝 **บันทึกคะแนนสะดวกรวดเร็ว:**
  - เหรียญทอง (+10 แต้ม หรือกำหนดเองได้)
  - เหรียญเงิน (+7 แต้ม)
  - เหรียญทองแดง (+5 แต้ม)
  - คะแนนพิเศษ เช่น ขบวนพาเหรด, เชียร์ลีดเดอร์ (+คะแนนตามจริง)
- 🎨 **จัดการสีและกีฬา:** สามารถเพิ่มสีใหม่ (เช่น สีม่วง สีส้ม สีชมพู) และเพิ่มชนิดกีฬาใหม่ได้ตลอดเวลาผ่านหน้าเว็บ
- ↩️ **ระบบยกเลิก/ลบคะแนน (Undo/Delete):** หากลงคะแนนผิด สามารถกดลบในประวัติคะแนนล่าสุดเพื่อหักคะแนนคืนทันที
- 🎉 **เอฟเฟกต์พลุเฉลิมฉลอง (Confetti):** ยิงพลุกระดาษเมื่อบันทึกคะแนน หรือเมื่อมีสีใหม่แซงขึ้นอันดับ 1

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
├── main.py              # แอปพลิเคชัน FastAPI, Routes และ REST API
├── database.py          # การเชื่อมต่อฐานข้อมูล (SQLite / PostgreSQL) และ Models
├── schemas.py           # Pydantic Schemas สำหรับตรวจสอบข้อมูล
├── requirements.txt     # ไลบรารี Python ที่ต้องใช้
├── runtime.txt          # กำหนดเวอร์ชัน Python (Python 3.11) สำหรับ Render
├── Procfile             # คำสั่งสำหรับรันเซิร์ฟเวอร์บน Render / Heroku
├── render.yaml          # ไฟล์ตั้งค่า Render Blueprint (1-Click Deploy)
├── .gitignore           # ไฟล์ที่ไม่ต้องการให้อัปโหลดขึ้น Git
├── static/
│   ├── css/custom.css   # สไตล์เพิ่มเติม, แอนิเมชัน, ฟอนต์ Kanit/Prompt
│   └── js/app.js        # ฟังก์ชัน JavaScript สำหรับหน้าเว็บแบบ Reactive
└── templates/
    └── index.html       # หน้า Dashboard หลักพร้อม Modal จัดการคะแนน
```

---

## 🚀 วิธีการรันในเครื่องของคุณ (Local Run)

### 1. ติดตั้ง Python
ตรวจสอบว่ามี Python 3.10 ขึ้นไปในเครื่อง โดยเปิด Terminal / PowerShell แล้วพิมพ์:
```bash
python --version
```

### 2. ติดตั้ง Dependencies
```bash
pip install -r requirements.txt
```

### 3. รันเซิร์ฟเวอร์
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
เปิดเว็บเบราว์เซอร์ไปที่: **`http://localhost:8000`**

- **รหัส PIN ผู้ดูแลระบบเริ่มต้น:** `1234`
- ข้อมูลเริ่มต้นจะสร้าง 4 สีมาตรฐานให้อัตโนมัติ: **สีแดง, สีน้ำเงิน, สีเขียว, สีเหลือง** พร้อมรายการกีฬาพื้นฐาน

---

## 🌐 วิธีนำขึ้น Render.com (Deployment Guide)

### ขั้นตอนที่ 1: นำโค้ดขึ้น GitHub
1. สร้าง Repository ใหม่บน [GitHub.com](https://github.com) (เช่น ตั้งชื่อว่า `sports-day-scoreboard`)
2. อัปโหลดไฟล์ทั้งหมดในโปรเจกต์นี้ขึ้น GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for sports day web app"
   git branch -M main
   git remote add origin https://github.com/<ชื่อผู้ใช้ของคุณ>/sports-day-scoreboard.git
   git push -u origin main
   ```

---

### ขั้นตอนที่ 2: ติดตั้งบน Render.com (ฟรี!)

มี 2 วิธีให้เลือก:

#### วิธีที่ A: สร้าง Web Service โดยตรง (แนะนำ - ง่ายที่สุด)
1. สมัครหรือเข้าสู่ระบบที่ [Render.com](https://render.com)
2. กดปุ่ม **New +** ที่มุมขวาบน แล้วเลือก **Web Service**
3. เลือก **Build and deploy from a Git repository** แล้วกด **Next**
4. เชื่อมต่อกับ GitHub และเลือก Repository ที่เพิ่งอัปโหลดไป
5. ตั้งค่าดังนี้:
   - **Name:** `sports-day-scoreboard` (หรือชื่ออะไรก็ได้)
   - **Region:** `Singapore` (ใกล้ไทย ตอบสนองเร็วที่สุด)
   - **Branch:** `main`
   - **Runtime:** `Python 3`
   - **Build Command:**
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command:**
     ```bash
     uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type:** `Free`
6. (ตัวเลือก) เลื่อนลงไปที่ **Environment Variables** แล้วเพิ่มค่า:
   - `ADMIN_PIN`: รหัสผ่านผู้ดูแลระบบ เช่น `1234` หรือรหัสที่คุณต้องการ
   - `GOLD_POINTS`: คะแนนเหรียญทอง (ค่าเริ่มต้น `10`)
   - `SILVER_POINTS`: คะแนนเหรียญเงิน (ค่าเริ่มต้น `7`)
   - `BRONZE_POINTS`: คะแนนเหรียญทองแดง (ค่าเริ่มต้น `5`)
7. กด **Create Web Service**
8. รอ 1-2 นาที เมื่อ Build สำเร็จ คุณจะได้ URL ของคุณ เช่น `https://sports-day-scoreboard.onrender.com` สามารถแชร์ให้นักเรียน ครู และผู้ชมใช้งานได้ทันที!

---

#### วิธีที่ B: ใช้งานร่วมกับ Render PostgreSQL (กรณีต้องการเก็บข้อมูลถาวรข้ามรีสตาร์ต)
> 💡 *หมายเหตุ: Web Service ฟรีของ Render จะรีเซ็ตดิสก์เมื่อไม่มีการใช้งานเป็นเวลานาน หากต้องการให้ข้อมูลคะแนนไม่หายเลย แนะนำให้ต่อ Render PostgreSQL ฟรี*

1. บน Render.com กด **New +** -> **PostgreSQL**
2. ตั้งชื่อ Database เช่น `sports-db` แล้วเลือก Free Plan
3. เมื่อสร้างเสร็จ ให้คัดลอกค่า **Internal Database URL**
4. ไปที่หน้า Web Service ของคุณ -> เมนู **Environment**
5. เพิ่ม Environment Variable:
   - Key: `DATABASE_URL`
   - Value: วาง Internal Database URL ที่คัดลอกมา
6. กด **Save Changes** ระบบจะเชื่อมต่อกับ PostgreSQL ให้อัตโนมัติ โดยไม่ต้องแก้โค้ดใดๆ เพิ่มเติม!

---

## 🔑 ข้อมูลสำหรับผู้ดูแลระบบ (Admin Guide)

1. **การเข้าสู่ระบบผู้ดูแล:**
   - กดปุ่ม **"เข้าสู่ระบบผู้ดูแล"** ที่มุมขวาบนของหน้าเว็บ
   - กรอกรหัส PIN (ค่าเริ่มต้นคือ `1234`)
   - เมื่อเข้าสู่ระบบแล้ว จะปรากฏปุ่ม **"+ บันทึกคะแนน"**, ปุ่มจัดการสี และปุ่มตั้งค่าระบบ
2. **การเปลี่ยนรหัส PIN และเกณฑ์คะแนน:**
   - กดที่ไอคอนรูปฟันเฟือง ⚙️ (ตั้งค่าระบบ)
   - ปรับเปลี่ยนชื่องาน, คะแนนเหรียญทอง/เงิน/ทองแดง หรือกำหนดรหัส PIN ใหม่ได้ทันที
3. **การรีเซ็ตคะแนนทั้งหมด:**
   - ในหน้าต่างตั้งค่าระบบ เลื่อนลงด้านล่างสุดจะพบแถบสีแดง **"รีเซ็ตคะแนนทั้งหมดให้เป็น 0"** สำหรับใช้เมื่อเริ่มต้นงานกีฬาสีรอบใหม่

---

## 🛠️ รายละเอียดทางเทคนิค (Tech Stack)

- **Backend:** FastAPI, Uvicorn, SQLAlchemy ORM
- **Database:** SQLite (Local/Standalone) & PostgreSQL (Render Production)
- **Frontend:** Vanilla JS, Jinja2 Templates, Tailwind CSS (via CDN)
- **UI Libraries:** SweetAlert2, Canvas-Confetti, Google Fonts (Kanit & Prompt)

