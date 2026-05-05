import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from dotenv import load_dotenv

load_dotenv()

try:
    firebase_admin.get_app()
except ValueError:
    from config import Config
    import json
    from pathlib import Path

    firebase_creds_json = os.getenv("FIREBASE_CREDENTIALS")
    
    if firebase_creds_json:
        try:
            cred_dict = json.loads(firebase_creds_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("Firebase initialized with FIREBASE_CREDENTIALS env var")
        except Exception as e:
            print(f"Failed to load FIREBASE_CREDENTIALS: {e}")
            
    if not firebase_admin._apps:
        key_path = Path(Config.FIREBASE_KEY_PATH)
        
        if not key_path.is_absolute():
            backend_root = Path(__file__).resolve().parent.parent
            key_path = backend_root / Config.FIREBASE_KEY_PATH
            
        if key_path.exists():
            cred = credentials.Certificate(str(key_path))
            firebase_admin.initialize_app(cred)
            print(f"Firebase initialized with key file at: {key_path}")
        else:
            print(f"Warning: Service Account Key not found at {key_path}")
            firebase_admin.initialize_app(options={'projectId': Config.FIREBASE_PROJECT_ID})

security = HTTPBearer()

from Database.database import get_db

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        email = decoded_token.get('email')
        name = decoded_token.get('name')
        picture = decoded_token.get('picture')
        
        from Services.credit_service import CreditService
        await CreditService.initialize_user(uid, email, name, picture)
        
        return decoded_token
    except Exception as e:
        print(f"❌ Auth Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
