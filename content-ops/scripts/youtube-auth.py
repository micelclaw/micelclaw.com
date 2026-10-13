#!/usr/bin/env python3
"""Local YouTube OAuth bootstrap. Never uploads or prints credentials."""
import argparse
import json
import os
from pathlib import Path
import tempfile
from datetime import datetime, timezone

CONFIG = Path('/home/victor/.config/micelclaw-youtube')
CLIENT = CONFIG / 'client_secret.json'
TOKEN = CONFIG / 'token.json'
PROJECT = 'micelclaw-youtube-publisher'
SCOPES = ['https://www.googleapis.com/auth/youtube.upload']
MANAGEMENT_SCOPES = SCOPES + ['https://www.googleapis.com/auth/youtube.force-ssl']


def validate_client():
    data = json.loads(CLIENT.read_text())
    client = data.get('installed', {})
    if client.get('project_id') != PROJECT:
        raise ValueError('Unexpected project or application type')
    if not all(client.get(k) for k in ('client_id', 'client_secret', 'auth_uri', 'token_uri')):
        raise ValueError('Incomplete OAuth configuration')
    if CLIENT.stat().st_mode & 0o077 or CONFIG.stat().st_mode & 0o077:
        raise ValueError('Credentials permissions are not private')


def save_token(credentials):
    if not credentials.refresh_token or not credentials.has_scopes(SCOPES):
        raise ValueError('Offline access or upload permission missing')
    fd, name = tempfile.mkstemp(prefix='.token-', dir=CONFIG)
    try:
        with os.fdopen(fd, 'w') as stream:
            stream.write(credentials.to_json())
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, TOKEN)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    actions = parser.add_mutually_exclusive_group(required=True)
    actions.add_argument('--check', action='store_true')
    actions.add_argument('--authorize', action='store_true')
    actions.add_argument('--authorize-management', action='store_true')
    args = parser.parse_args()
    validate_client()
    if args.check:
        print('Configuración válida. Autorización guardada: ' + ('sí' if TOKEN.exists() else 'no'))
        return
    if TOKEN.exists() and not args.authorize_management:
        raise ValueError('Authorization already exists; refusing to overwrite')
    from google_auth_oauthlib.flow import InstalledAppFlow
    requested = MANAGEMENT_SCOPES if args.authorize_management else SCOPES
    flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT), requested)
    credentials = flow.run_local_server(
        host='localhost', bind_addr='127.0.0.1', port=0,
        open_browser=False, timeout_seconds=900,
        authorization_prompt_message='Abre este enlace con la cuenta de Micelclaw:\n{url}',
        success_message='Autorización recibida. Puedes cerrar esta pestaña. No se ha subido ningún vídeo.',
        prompt='consent select_account',
    )
    if not credentials.has_scopes(requested):
        raise ValueError('Required permissions were not granted')
    if TOKEN.exists():
        backup = CONFIG / ('token-backup-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '.json')
        fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'wb') as stream:
            stream.write(TOKEN.read_bytes())
    save_token(credentials)
    print('Autorización guardada con permisos privados. No se ha subido ningún vídeo.')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        # OAuth exceptions can contain codes, tokens and request URLs: never echo them.
        print('No se completó la autorización (' + type(exc).__name__ + '). No se muestran datos sensibles.')
        raise SystemExit(1)
