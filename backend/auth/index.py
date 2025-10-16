import json
import os
import hashlib
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: User authentication and registration with special code validation
    Args: event - dict with httpMethod, body, queryStringParameters
          context - object with request_id, function_name attributes
    Returns: HTTP response dict with user data or error
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'POST':
        import psycopg2
        
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action')
        
        db_url = os.environ.get('DATABASE_URL')
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        if action == 'register':
            email = body_data.get('email', '')
            password = body_data.get('password', '')
            user_type = body_data.get('user_type', 'regular')
            special_code = body_data.get('special_code', '')
            
            if user_type == 'special' and special_code != '669':
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Неверный код для особого пользователя'})
                }
            
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            cur.execute(
                "SELECT id FROM users WHERE email = %s",
                (email,)
            )
            
            if cur.fetchone():
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Email уже зарегистрирован'})
                }
            
            is_verified = user_type == 'special'
            
            cur.execute(
                "INSERT INTO users (email, password_hash, user_type, is_verified) VALUES (%s, %s, %s, %s) RETURNING id",
                (email, password_hash, user_type, is_verified)
            )
            
            user_id = cur.fetchone()[0]
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
                    'user_id': user_id,
                    'email': email,
                    'user_type': user_type,
                    'is_verified': is_verified
                })
            }
        
        elif action == 'login':
            email = body_data.get('email', '')
            password = body_data.get('password', '')
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            cur.execute(
                "SELECT id, email, user_type, is_verified FROM users WHERE email = %s AND password_hash = %s",
                (email, password_hash)
            )
            
            user = cur.fetchone()
            conn.close()
            
            if not user:
                return {
                    'statusCode': 401,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Неверный email или пароль'})
                }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({
                    'user_id': user[0],
                    'email': user[1],
                    'user_type': user[2],
                    'is_verified': user[3] if user[3] is not None else False
                })
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