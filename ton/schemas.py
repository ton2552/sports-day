from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# Team Schemas
class TeamBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color_code: str = Field(..., max_length=20)
    text_color: str = Field(default="#FFFFFF", max_length=20)


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color_code: Optional[str] = Field(None, max_length=20)
    text_color: Optional[str] = Field(None, max_length=20)


class TeamOut(TeamBase):
    id: int
    total_score: int = 0
    gold_count: int = 0
    silver_count: int = 0
    bronze_count: int = 0
    rank: int = 1

    class Config:
        from_attributes = True


# Sport Schemas
class SportBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: str = Field(default="ทั่วไป", max_length=50)


class SportCreate(SportBase):
    pass


class SportOut(SportBase):
    id: int

    class Config:
        from_attributes = True


# ScoreLog Schemas
class ScoreLogCreate(BaseModel):
    team_id: int
    sport_name: str
    award_type: str = Field(..., description="gold, silver, bronze, custom")
    points: Optional[int] = None  # If None, calculated from award_type and settings
    description: Optional[str] = None
    recorded_by: Optional[str] = "กรรมการ"


class ScoreLogOut(BaseModel):
    id: int
    team_id: int
    team_name: str
    team_color: str
    sport_name: str
    award_type: str
    points: int
    description: Optional[str]
    recorded_by: str
    created_at: datetime

    class Config:
        from_attributes = True


# Setting Schemas
class SettingsOut(BaseModel):
    title: str
    gold_points: int
    silver_points: int
    bronze_points: int


class SettingsUpdate(BaseModel):
    title: Optional[str] = None
    gold_points: Optional[int] = None
    silver_points: Optional[int] = None
    bronze_points: Optional[int] = None
    new_admin_pin: Optional[str] = None


class VerifyPinRequest(BaseModel):
    pin: str

