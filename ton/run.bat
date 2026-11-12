@echo off
chcp 65001 >nul
echo ========================================================
echo   🏆 ระบบบันทึกคะแนนกีฬาสี (Sports Day Live Scoreboard)
echo ========================================================
echo.
echo กำลังตรวจสอบ Python ในเครื่อง...

python --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] ตรวจไม่พบ Python ในเครื่อง หรือยังไม่ได้เปิดสิทธิ์ PATH
    echo --------------------------------------------------------
    echo 📌 วิธีแก้ไข:
    echo 1. ดาวน์โหลด Python 3.11 หรือใหม่กว่าจาก:
    echo    https://www.python.org/downloads/
    echo 2. ตอนเริ่มติดตั้ง ให้ติ๊กเครื่องหมายถูกที่:
    echo    [✓] "Add python.exe to PATH" (สำคัญมาก)
    echo 3. เมื่อติดตั้งเสร็จ ให้ปิดแล้วเปิดโปรแกรมใหม่อีกครั้ง
    echo --------------------------------------------------------
    echo.
    pause
    exit /b 1
)

echo [OK] พบ Python ในเครื่องเรียบร้อยแล้ว
echo กำลังติดตั้งไลบรารีจาก requirements.txt...
python -m pip install -r requirements.txt

echo.
echo [OK] พร้อมทำงาน! กำลังเปิดเว็บเบราว์เซอร์ไปที่ http://localhost:8000 ...
start http://localhost:8000
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause

