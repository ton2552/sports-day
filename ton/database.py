import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sports_day.db")

# Fix Render PostgreSQL URL format if needed
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    color_code = Column(String(20), nullable=False, default="#EF4444")
    text_color = Column(String(20), nullable=False, default="#FFFFFF")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    score_logs = relationship("ScoreLog", back_populates="team", cascade="all, delete-orphan")


class Sport(Base):
    __tablename__ = "sports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    category = Column(String(50), default="ทั่วไป")
    created_at = Column(DateTime, default=datetime.utcnow)


class ScoreLog(Base):
    __tablename__ = "score_logs"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    sport_name = Column(String(100), nullable=False)
    award_type = Column(String(20), nullable=False)  # gold, silver, bronze, custom
    points = Column(Integer, nullable=False)
    description = Column(String(255), nullable=True)
    recorded_by = Column(String(100), default="กรรมการ")
    created_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="score_logs")


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(50), primary_key=True)
    value = Column(String(255), nullable=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Initialize default settings if not exists
        default_settings = {
            "title": "มหกรรมกีฬาสีสัมพันธ์ 2026",
            "gold_points": os.getenv("GOLD_POINTS", "10"),
            "silver_points": os.getenv("SILVER_POINTS", "7"),
            "bronze_points": os.getenv("BRONZE_POINTS", "5"),
            "admin_pin": os.getenv("ADMIN_PIN", "1234")
        }
        for k, v in default_settings.items():
            if not db.query(AppSetting).filter(AppSetting.key == k).first():
                db.add(AppSetting(key=k, value=str(v)))

        # Initialize default teams if empty
        if db.query(Team).count() == 0:
            initial_teams = [
                {"name": "สีแดง (Red Garnet)", "color_code": "#EF4444", "text_color": "#FFFFFF"},
                {"name": "สีน้ำเงิน (Blue Ocean)", "color_code": "#3B82F6", "text_color": "#FFFFFF"},
                {"name": "สีเขียว (Green Emerald)", "color_code": "#10B981", "text_color": "#FFFFFF"},
                {"name": "สีเหลือง (Yellow Sun)", "color_code": "#F59E0B", "text_color": "#FFFFFF"},
            ]
            for t_data in initial_teams:
                team = Team(**t_data)
                db.add(team)

        # Initialize default sports if empty
        if db.query(Sport).count() == 0:
            initial_sports = [
                {"name": "ฟุตบอล", "category": "กีฬาประเภททีม"},
                {"name": "วอลเลย์บอล", "category": "กีฬาประเภททีม"},
                {"name": "บาสเกตบอล", "category": "กีฬาประเภททีม"},
                {"name": "แชร์บอล", "category": "กีฬาประเภททีม"},
                {"name": "ชักเย่อ", "category": "กีฬาพื้นบ้าน"},
                {"name": "วิ่ง 100 เมตร ชาย/หญิง", "category": "กรีฑา"},
                {"name": "วิ่งผลัด 4x100 เมตร", "category": "กรีฑา"},
                {"name": "กองเชียร์และเชียร์ลีดเดอร์", "category": "กิจกรรมพิเศษ"},
                {"name": "ขบวนพาเหรด", "category": "กิจกรรมพิเศษ"},
            ]
            for s_data in initial_sports:
                sport = Sport(**s_data)
                db.add(sport)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error during db initialization: {e}")
    finally:
        db.close()

