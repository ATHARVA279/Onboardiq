from pydantic import BaseModel, Field, validator, HttpUrl
from typing import List, Optional
import ipaddress
from urllib.parse import urlparse

class ExtractRequest(BaseModel):
    url: HttpUrl
    use_advanced_rag: bool = False

    @validator('url')
    def validate_url_security(cls, v):
        url_str = str(v)
        parsed = urlparse(url_str)
        
        if parsed.scheme not in ('http', 'https'):
            raise ValueError('URL must use http or https scheme')
            
        hostname = parsed.hostname
        if not hostname:
            raise ValueError('Invalid hostname')
            
        if hostname in ('localhost', '127.0.0.1', '::1'):
            raise ValueError('Localhost access is restricted')
            
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private:
                raise ValueError('Private IP access is restricted')
        except ValueError:
            pass
            
        return v

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    top_k: int = Field(default=4, ge=1, le=10)
    document_id: str = Field(..., min_length=1)

class GenerateNotesRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)
    content: Optional[str] = None
    use_stored_content: bool = False
    document_id: Optional[str] = None  

    @validator('content')
    def validate_content_dependency(cls, v, values):
        if not values.get('use_stored_content') and not v:
            raise ValueError('Content must be provided if use_stored_content is False')
        return v

class SummaryRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=50000)
    max_sentences: int = Field(default=3, ge=1, le=10)

class GenerateQuizRequest(BaseModel):
    count: int = Field(default=10, ge=5, le=20)
    topics: List[str] = Field(..., min_items=1, max_items=5)
    document_id: Optional[str] = None  
