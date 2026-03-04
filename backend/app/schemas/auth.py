from pydantic import BaseModel, EmailStr


class ClientRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class OwnerLoginRequest(BaseModel):
    email: EmailStr
    password: str


class ClientLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str


class RefreshRequest(BaseModel):
    refresh_token: str


class MeResponse(BaseModel):
    id: int | None
    email: str
    name: str
    role: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
