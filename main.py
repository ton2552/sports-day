import os
from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, Header, Request, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import engine, get_db, init_db, Team, Sport, ScoreLog, AppSetting
import schemas


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and default values
    init_db()
    yield


app = FastAPI(
    title="ระบบบันทึกคะแนนกีฬาสี (Sports Day Scoreboard)",
    description="เว็บแอปพลิเคชันสำหรับบันทึกและถ่ายทอดคะแนนกีฬาสี รองรับ Render.com",
    version="1.0.0",
    lifespan=lifespan
)

# Static and Templates mounting
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)
os.makedirs("templates", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# --- Helper Functions ---

def get_setting_val(db: Session, key: str, default: str = "") -> str:
    setting = db.query(AppSetting).filter(AppSetting.key == key).first()
    return setting.value if setting else default


def set_setting_val(db: Session, key: str, value: str):
    setting = db.query(AppSetting).filter(AppSetting.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = AppSetting(key=key, value=value)
        db.add(setting)
    db.commit()


def check_admin(db: Session = Depends(get_db), x_admin_pin: Optional[str] = Header(None)):
    current_pin = get_setting_val(db, "admin_pin", os.getenv("ADMIN_PIN", "1234"))
    if not x_admin_pin or x_admin_pin.strip() != current_pin.strip():
        raise HTTPException(
            status_code=403,
            detail="รหัสผ่าน PIN ไม่ถูกต้อง กรุณาเข้าสู่ระบบผู้ดูแลก่อนทำรายการ"
        )
    return True


def compute_leaderboard(db: Session):
    teams = db.query(Team).all()
    logs = db.query(ScoreLog).all()

    # Pre-aggregate scores
    team_stats = {
        t.id: {
            "id": t.id,
            "name": t.name,
            "color_code": t.color_code,
            "text_color": t.text_color,
            "total_score": 0,
            "gold_count": 0,
            "silver_count": 0,
            "bronze_count": 0,
            "log_count": 0
        }
        for t in teams
    }

    for log in logs:
        if log.team_id in team_stats:
            team_stats[log.team_id]["total_score"] += log.points
            team_stats[log.team_id]["log_count"] += 1
            if log.award_type == "gold":
                team_stats[log.team_id]["gold_count"] += 1
            elif log.award_type == "silver":
                team_stats[log.team_id]["silver_count"] += 1
            elif log.award_type == "bronze":
                team_stats[log.team_id]["bronze_count"] += 1

    # Sort teams by total_score desc, gold desc, silver desc, bronze desc
    sorted_teams = sorted(
        team_stats.values(),
        key=lambda x: (x["total_score"], x["gold_count"], x["silver_count"], x["bronze_count"]),
        reverse=True
    )

    # Assign ranks
    for index, item in enumerate(sorted_teams):
        item["rank"] = index + 1

    return sorted_teams


# --- Web Page Route ---

@app.get("/", response_class=HTMLResponse)
async def home(request: Request, db: Session = Depends(get_db)):
    title = get_setting_val(db, "title", "มหกรรมกีฬาสีสัมพันธ์ 2026")
    return templates.TemplateResponse("index.html", {
        "request": request,
        "title": title
    })


# --- Healthcheck ---

@app.get("/health")
def healthcheck():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# --- Authentication ---

@app.post("/api/auth/verify")
def verify_pin(data: schemas.VerifyPinRequest, db: Session = Depends(get_db)):
    current_pin = get_setting_val(db, "admin_pin", os.getenv("ADMIN_PIN", "1234"))
    if data.pin.strip() == current_pin.strip():
        return {"success": True, "message": "ยืนยันรหัส PIN สำเร็จ"}
    raise HTTPException(status_code=400, detail="รหัสผ่าน PIN ไม่ถูกต้อง")


# --- Leaderboard API ---

@app.get("/api/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    leaderboard = compute_leaderboard(db)
    title = get_setting_val(db, "title", "มหกรรมกีฬาสีสัมพันธ์ 2026")
    gold_pts = int(get_setting_val(db, "gold_points", "10"))
    silver_pts = int(get_setting_val(db, "silver_points", "7"))
    bronze_pts = int(get_setting_val(db, "bronze_points", "5"))

    return {
        "title": title,
        "settings": {
            "gold_points": gold_pts,
            "silver_points": silver_pts,
            "bronze_points": bronze_pts
        },
        "teams": leaderboard,
        "podium": leaderboard[:3] if len(leaderboard) >= 3 else leaderboard
    }


# --- Teams API ---

@app.get("/api/teams")
def list_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).order_by(Team.id).all()
    return teams


@app.post("/api/teams")
def create_team(
    team_in: schemas.TeamCreate,
    db: Session = Depends(get_db),
    authorized: bool = Depends(check_admin)
):
    team = Team(
        name=team_in.name,
        color_code=team_in.color_code,
        text_color=team_in.text_color
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


@app.put("/api/teams/{team_id}")
def update_team(
    team_id: int,
    team_in: schemas.TeamUpdate,
    db: Session = Depends(get_db),
    authorized: bool = Depends(check_admin)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลสีที่ระบุ")
    if team_in.name is not None:
        team.name = team_in.name
    if team_in.color_code is not None:
        team.color_code = team_in.color_code
    if team_in.text_color is not None:
        team.text_color = team_in.text_color
    db.commit()
    db.refresh(team)
    return team


@app.delete("/api/teams/{team_id}")
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    authorized: bool = Depends(check_admin)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลสีที่ระบุ")
    db.delete(team)
    db.commit()
    return {"success": True, "message": f"ลบ {team.name} เรียบร้อยแล้ว"}


# --- Sports API ---

@app.get("/api/sports")
def list_sports(db: Session = Depends(get_db)):
    sports = db.query(Sport).order_by(Sport.category, Sport.name).all()
    return sports


@app.post("/api/sports")
def create_sport(
    sport_in: schemas.SportCreate,
    db: Session = Depends(get_db),
    authorized: bool = Depends(check_admin)
):
    existing = db.query(Sport).filter(Sport.name == sport_in.name).first()
    if existing:
        return existing
    sport = Sport(name=sport_in.name, category=sport_in.category)
    db.add(sport)
    db.commit()
    db.refresh(sport)
    return sport


@app.delete("/api/sports/{sport_id}")
def delete_sport(
    sport_id: int,
    db: Session = Depends(get_db),
    authorized: bool = Depends(check_admin)
):
    sport = db.query(Sport).filter(Sport.id == sport_id).first()
    if not sport:
        raise HTTPException(status_code=404, detail="ไม่พบรายการกีฬา")
    db.delete(sport)
    db.commit()
    return {"success": True, "message": f"ลบกีฬา {sport.name} แล้ว"}


# --- Scores & Logs API ---

@app.get("/api/scores")
def list_scores(
    limit: int = Query(50, ge=1, le=200),
    team_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ScoreLog)
    if team_id:
        query = query.filter(ScoreLog.team_id == team_id)
    logs = query.order_by(desc(ScoreLog.created_at)).limit(limit).all()

    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "team_id": log.team_id,
            "team_name": log.team.name if log.team else "ไม่ระบุ",
            "team_color": log.team.color_code if log.team else "#999999",
            "sport_name": log.sport_name,
            "award_type": log.award_type,
            "points": log.points,
            "description": log.description or "",
            "recorded_by": log.recorded_by or "กรรมการ",
            "created_at": log.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    return result


@app.post("/api/scores")
def add_score(
    score_in: schemas.ScoreLogCreate,
    db: Session = Depends(get_db),
    authorized: bool = Depends(check_admin)
):
    team = db.query(Team).filter(Team.id == score_in.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลสีที่เลือก")

    # Determine points if not explicitly specified
    pts = score_in.points
    if pts is None:
        gold_pts = int(get_setting_val(db, "gold_points", "10"))
        silver_pts = int(get_setting_val(db, "silver_points", "7"))
        bronze_pts = int(get_setting_val(db, "bronze_points", "5"))

        if score_in.award_type == "gold":
            pts = gold_pts
        elif score_in.award_type == "silver":
            pts = silver_pts
        elif score_in.award_type == "bronze":
            pts = bronze_pts
        else:
            pts = 0

    log = ScoreLog(
        team_id=score_in.team_id,
        sport_name=score_in.sport_name,
        award_type=score_in.award_type,
        points=pts,
        description=score_in.description,
        recorded_by=score_in.recorded_by or "กรรมการ"
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "success": True,
        "message": f"บันทึกคะแนน {team.name} (+{pts} คะแนน) สำเร็จ",
        "data": {
            "id": log.id,
            "team_name": team.name,
            "points": log.points,
            "sport_name": log.sport_name
        }
    }


@app.delete("/api/scores/{score_id}")
def delete_score(
    score_id: int,
    db: Session = Depends(get_db),
    authorized: bool = Depends(check_admin)
):
    log = db.query(ScoreLog).filter(ScoreLog.id == score_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="ไม่พบรายการบันทึกคะแนนนี้")
    db.delete(log)
    db.commit()
    return {"success": True, "message": "ลบรายการบันทึกคะแนนเรียบร้อยแล้ว"}


# --- Settings API ---

@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    return {
        "title": get_setting_val(db, "title", "มหกรรมกีฬาสีสัมพันธ์ 2026"),
        "gold_points": int(get_setting_val(db, "gold_points", "10")),
        "silver_points": int(get_setting_val(db, "silver_points", "7")),
        "bronze_points": int(get_setting_val(db, "bronze_points", "5"))
    }


@app.put("/api/settings")
def update_settings(
    settings_in: schemas.SettingsUpdate,
    db: Session = Depends(get_db),
    authorized: bool = Depends(check_admin)
):
    if settings_in.title is not None:
        set_setting_val(db, "title", settings_in.title)
    if settings_in.gold_points is not None:
        set_setting_val(db, "gold_points", str(settings_in.gold_points))
    if settings_in.silver_points is not None:
        set_setting_val(db, "silver_points", str(settings_in.silver_points))
    if settings_in.bronze_points is not None:
        set_setting_val(db, "bronze_points", str(settings_in.bronze_points))
    if settings_in.new_admin_pin is not None and settings_in.new_admin_pin.strip():
        set_setting_val(db, "admin_pin", settings_in.new_admin_pin.strip())

    return {"success": True, "message": "บันทึกการตั้งค่าเรียบร้อยแล้ว"}


@app.post("/api/reset-scores")
def reset_all_scores(
    db: Session = Depends(get_db),
    authorized: bool = Depends(check_admin)
):
    db.query(ScoreLog).delete()
    db.commit()
    return {"success": True, "message": "รีเซ็ตคะแนนทั้งหมดเรียบร้อยแล้ว"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

