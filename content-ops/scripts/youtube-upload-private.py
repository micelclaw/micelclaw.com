#!/usr/bin/env python3
"""Explicit private-only YouTube upload, with durable duplicate protection."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import tempfile

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload
_spec = importlib.util.spec_from_file_location('youtube_auth', Path(__file__).with_name('youtube-auth.py'))
_auth = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_auth)
CONFIG, TOKEN, SCOPES = _auth.CONFIG, _auth.TOKEN, _auth.SCOPES
save_token, validate_client = _auth.save_token, _auth.validate_client

EXPECTED_CHANNEL = 'UCAuPn0hzQp8s6JBuO5W9aIA'


def payload(meta):
    if not meta.get('title') or len(meta['title']) > 100:
        raise ValueError('Invalid title')
    if '<link-' in json.dumps(meta) or len(meta.get('description', '')) > 5000:
        raise ValueError('Unresolved metadata')
    return {
        'snippet': {k: meta[k] for k in ('title', 'description', 'tags', 'categoryId', 'defaultLanguage')},
        'status': {'privacyStatus': 'private', 'selfDeclaredMadeForKids': False},
    }


def write_receipt(path, data):
    fd, name = tempfile.mkstemp(prefix='.upload-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as stream:
            json.dump(data, stream, indent=2)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--file', type=Path, required=True)
    parser.add_argument('--metadata', type=Path, required=True)
    parser.add_argument('--item', required=True)
    parser.add_argument('--execute-private', action='store_true')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9-]+', args.item):
        raise ValueError('Invalid item')
    if not args.file.is_file() or args.file.suffix.lower() != '.mp4':
        raise ValueError('MP4 missing')
    body = payload(json.loads(args.metadata.read_text()))
    with args.file.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    if not args.execute_private:
        print(json.dumps({'item': args.item, 'size': args.file.stat().st_size, 'privacy': 'private', 'title': body['snippet']['title']}))
        return
    validate_client()
    if TOKEN.stat().st_mode & 0o077:
        raise ValueError('Token permissions are not private')
    credentials = Credentials.from_authorized_user_file(str(TOKEN))
    if not credentials.has_scopes(SCOPES):
        raise ValueError('Upload permission missing')
    if not credentials.valid:
        credentials.refresh(Request())
        save_token(credentials)
    uploads = CONFIG / 'uploads'
    uploads.mkdir(mode=0o700, exist_ok=True)
    if uploads.stat().st_mode & 0o077:
        raise ValueError('Receipt directory permissions are not private')
    receipt = uploads / (args.item + '.json')
    if receipt.exists():
        previous = json.loads(receipt.read_text())
        if previous.get('id'):
            print('[skip] Ya subido: https://youtu.be/' + previous['id'])
            return
        raise ValueError('Previous attempt uncertain: reconcile in Studio before retrying')
    service = build('youtube', 'v3', credentials=credentials, cache_discovery=False)
    state = {'item': args.item, 'sha256': digest, 'state': 'uploading', 'privacy': 'private'}
    # Exclusive marker prevents concurrent uploads; an uncertain attempt never retries silently.
    fd = os.open(receipt, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, 'w') as stream:
        json.dump(state, stream)
        stream.flush()
        os.fsync(stream.fileno())
    upload = service.videos().insert(
        part='snippet,status', body=body, notifySubscribers=False,
        media_body=MediaFileUpload(str(args.file), mimetype='video/mp4', chunksize=8 * 1024 * 1024, resumable=True),
    )
    response = None
    while response is None:
        progress, response = upload.next_chunk(num_retries=3)
        if progress:
            print('Subida: ' + str(round(progress.progress() * 100)) + '%', flush=True)
    video_id = response.get('id')
    if not video_id:
        raise ValueError('Missing upload ID; reconcile before retry')
    state.update({
        'id': video_id, 'state': 'uploaded',
        'channelId': response.get('snippet', {}).get('channelId'),
        'channelTitle': response.get('snippet', {}).get('channelTitle'),
        'privacy': response.get('status', {}).get('privacyStatus'),
        'uploadStatus': response.get('status', {}).get('uploadStatus'),
    })
    write_receipt(receipt, state)
    if state['privacy'] != 'private' or state['channelId'] != EXPECTED_CHANNEL:
        print(json.dumps(state))
        raise ValueError('Unexpected channel or privacy; upload retained, do not retry')
    print(json.dumps(state))
    print('Vídeo privado: https://youtu.be/' + video_id)
    # Read-only verification. This may be unavailable with upload-only scope.
    try:
        result = service.videos().list(part='snippet,status,processingDetails', id=video_id).execute()
        items = result.get('items', [])
        if items:
            video = items[0]
            state['verification'] = {
                'privacy': video.get('status', {}).get('privacyStatus'),
                'channelId': video.get('snippet', {}).get('channelId'),
                'uploadStatus': video.get('status', {}).get('uploadStatus'),
                'processingStatus': video.get('processingDetails', {}).get('processingStatus'),
            }
            write_receipt(receipt, state)
            print('Verificación: ' + json.dumps(state['verification']))
        else:
            print('Sin resultado en consulta posterior; comprobar en Studio.')
    except HttpError as exc:
        print('Consulta posterior no disponible (HTTP ' + str(exc.resp.status) + '). La respuesta de subida está guardada.')


if __name__ == '__main__':
    try:
        main()
    except HttpError as exc:
        print('Error de API HTTP ' + str(exc.resp.status) + '. No se muestran credenciales ni respuesta completa. No repetir una subida incierta.')
        raise SystemExit(1)
    except Exception as exc:
        print('Operación interrumpida (' + type(exc).__name__ + '). Revisar recibo/Studio antes de reintentar; no se muestran secretos.')
        raise SystemExit(1)
