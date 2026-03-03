import datetime
from pydantic import BaseModel
from typing import Optional


class LoginLogResponse(BaseModel):
    id: int
    login_time: datetime.datetime
    ip_address: str
    device_type: str
    browser: str
    location: Optional[str]
    status: str
    is_owner: bool

    class Config:
        from_attributes = True
