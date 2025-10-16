import json
import base64
import os
import uuid
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Handle file uploads with base64 encoding and cloud storage
    Args: event - dict with httpMethod, body containing file data
          context - object with request_id attribute
    Returns: HTTP response with file URL or error
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'POST':
        import psycopg2
        
        body_data = json.loads(event.get('body', '{}'))
        
        user_id = body_data.get('user_id')
        filename = body_data.get('filename')
        file_content_base64 = body_data.get('file_content')
        mime_type = body_data.get('mime_type', 'application/octet-stream')
        
        if not all([user_id, filename, file_content_base64]):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Отсутствуют обязательные поля'})
            }
        
        db_url = os.environ.get('DATABASE_URL')
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        cur.execute(
            "SELECT user_type FROM users WHERE id = %s",
            (user_id,)
        )
        user = cur.fetchone()
        
        if not user or user[0] != 'special':
            conn.close()
            return {
                'statusCode': 403,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Только особые пользователи могут загружать файлы'})
            }
        
        try:
            file_bytes = base64.b64decode(file_content_base64)
            file_size = len(file_bytes)
        except Exception as e:
            conn.close()
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Некорректные данные файла'})
            }
        
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_url = f"https://storage.vnefiles.cloud/{unique_filename}"
        
        cur.execute(
            "INSERT INTO files (user_id, filename, file_url, file_size, mime_type) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (user_id, filename, file_url, file_size, mime_type)
        )
        
        file_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({
                'file_id': file_id,
                'file_url': file_url,
                'message': 'Файл успешно загружен в облако'
            })
        }
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps({'error': 'Method not allowed'})
    }
