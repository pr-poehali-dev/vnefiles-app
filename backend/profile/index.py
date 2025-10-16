import json
import os
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: User profile management - view and update profiles
    Args: event - dict with httpMethod, body, queryStringParameters
          context - object with request_id attribute
    Returns: HTTP response dict with profile data
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
        params = event.get('queryStringParameters', {}) or {}
        user_id = params.get('user_id')
        
        if not user_id:
            conn.close()
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'user_id обязателен'})
            }
        
        cur.execute(
            "SELECT id, email, user_type, is_verified, full_name, bio, avatar_url, created_at FROM users WHERE id = %s",
            (user_id,)
        )
        
        user = cur.fetchone()
        
        if not user:
            conn.close()
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Пользователь не найден'})
            }
        
        cur.execute(
            "SELECT COUNT(*) FROM files WHERE user_id = %s",
            (user_id,)
        )
        files_count = cur.fetchone()[0]
        
        cur.execute(
            "SELECT COALESCE(SUM(downloads_count), 0) FROM files WHERE user_id = %s",
            (user_id,)
        )
        total_downloads = cur.fetchone()[0]
        
        conn.close()
        
        profile_data = {
            'user_id': user[0],
            'email': user[1],
            'user_type': user[2],
            'is_verified': user[3],
            'full_name': user[4],
            'bio': user[5],
            'avatar_url': user[6],
            'created_at': user[7].isoformat() if user[7] else None,
            'stats': {
                'files_count': files_count,
                'total_downloads': total_downloads
            }
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps(profile_data)
        }
    
    elif method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        user_id = body_data.get('user_id')
        full_name = body_data.get('full_name')
        bio = body_data.get('bio')
        avatar_url = body_data.get('avatar_url')
        
        if not user_id:
            conn.close()
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'user_id обязателен'})
            }
        
        cur.execute(
            "UPDATE users SET full_name = %s, bio = %s, avatar_url = %s WHERE id = %s RETURNING id",
            (full_name, bio, avatar_url, user_id)
        )
        
        if cur.rowcount == 0:
            conn.close()
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Пользователь не найден'})
            }
        
        conn.commit()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'message': 'Профиль обновлён'})
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
