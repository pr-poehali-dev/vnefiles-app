import json
import os
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: File management - upload metadata, list files, track downloads
    Args: event - dict with httpMethod, body, queryStringParameters, headers
          context - object with request_id attribute
    Returns: HTTP response dict with file data
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    import psycopg2
    
    db_url = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    if method == 'GET':
        cur.execute(
            "SELECT f.id, f.filename, f.file_url, f.file_size, f.mime_type, f.downloads_count, f.created_at, u.email, u.user_type, u.id, u.is_verified FROM files f JOIN users u ON f.user_id = u.id ORDER BY f.created_at DESC"
        )
        
        files = []
        for row in cur.fetchall():
            files.append({
                'id': row[0],
                'filename': row[1],
                'file_url': row[2],
                'file_size': row[3],
                'mime_type': row[4],
                'downloads_count': row[5],
                'created_at': row[6].isoformat() if row[6] else None,
                'uploader_email': row[7],
                'uploader_type': row[8],
                'uploader_id': row[9],
                'uploader_verified': row[10]
            })
        
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'files': files})
        }
    
    elif method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action')
        
        if action == 'upload':
            user_id = body_data.get('user_id')
            filename = body_data.get('filename')
            file_url = body_data.get('file_url')
            file_size = body_data.get('file_size', 0)
            mime_type = body_data.get('mime_type', 'application/octet-stream')
            
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
                'body': json.dumps({'file_id': file_id, 'message': 'Файл загружен успешно'})
            }
        
        elif action == 'download':
            file_id = body_data.get('file_id')
            
            cur.execute(
                "UPDATE files SET downloads_count = downloads_count + 1 WHERE id = %s RETURNING file_url",
                (file_id,)
            )
            
            result = cur.fetchone()
            conn.commit()
            conn.close()
            
            if not result:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Файл не найден'})
                }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'file_url': result[0]})
            }
    
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps({'error': 'Method not allowed'})
    }