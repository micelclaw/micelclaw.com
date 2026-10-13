#!/usr/bin/env python3
"""Complete known Contacts uploads. No video deletion, no re-upload."""
import argparse
import importlib.util
import json
from pathlib import Path
import re
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

spec = importlib.util.spec_from_file_location('upload', Path(__file__).with_name('youtube-upload-private.py'))
upload = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upload)
SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl'
SNIPPET_KEYS = ('title', 'description', 'tags', 'categoryId', 'defaultLanguage', 'defaultAudioLanguage')
STATUS_KEYS = ('privacyStatus', 'license', 'embeddable', 'publicStatsViewable', 'selfDeclaredMadeForKids', 'containsSyntheticMedia')


def safe_error(exc):
    try:
        reasons = [e.get('reason', '') for e in json.loads(exc.content).get('error', {}).get('errors', [])]
        return {'http': exc.resp.status, 'reasons': [r for r in reasons if re.fullmatch(r'[A-Za-z0-9_-]+', r)]}
    except Exception:
        return {'http': exc.resp.status}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--item', choices=['ep4-contacts', 'ep4-contacts-short', 'ep5-mail', 'ep5-mail-short'], required=True)
    parser.add_argument('--metadata', type=Path, required=True)
    parser.add_argument('--captions', type=Path, required=True)
    parser.add_argument('--publish', action='store_true')
    args = parser.parse_args()
    upload.validate_client()
    if upload.TOKEN.stat().st_mode & 0o077:
        raise ValueError('Token permissions not private')
    credentials = Credentials.from_authorized_user_file(str(upload.TOKEN))
    if not credentials.has_scopes([SCOPE]):
        raise ValueError('Management consent missing')
    if not credentials.valid:
        credentials.refresh(Request())
        upload.save_token(credentials)
    path = upload.CONFIG / 'uploads' / (args.item + '.json')
    receipt = json.loads(path.read_text())
    video_id = receipt['id']
    service = build('youtube', 'v3', credentials=credentials, cache_discovery=False)
    video = service.videos().list(part='snippet,status,processingDetails', id=video_id).execute()['items'][0]
    if video['snippet']['channelId'] != upload.EXPECTED_CHANNEL:
        raise ValueError('Unexpected channel')
    meta = json.loads(args.metadata.read_text())
    upload.payload(meta)
    snippet = {k: video['snippet'][k] for k in SNIPPET_KEYS if k in video['snippet']}
    snippet.update({k: meta[k] for k in SNIPPET_KEYS if k in meta})
    snippet['defaultAudioLanguage'] = 'en'
    result = service.videos().update(part='snippet', body={'id': video_id, 'snippet': snippet}).execute()
    receipt['metadataApplied'] = all(
        set(result['snippet'].get(k, [])) == set(v) if k == 'tags'
        else result['snippet'].get(k) == v for k, v in snippet.items()
    )
    upload.write_receipt(path, receipt)
    print('Metadatos completos: ' + str(receipt['metadataApplied']))
    if not args.captions.is_file() or args.captions.suffix != '.srt':
        raise ValueError('SRT missing')
    tracks = service.captions().list(part='snippet', videoId=video_id).execute().get('items', [])
    existing = next((c for c in tracks if c['snippet']['language'] == 'en' and c['snippet']['name'] == 'English'), None)
    media = MediaFileUpload(str(args.captions), mimetype='application/octet-stream')
    if existing:
        caption = service.captions().update(part='snippet', body={'id': existing['id'], 'snippet': {'isDraft': False}}, media_body=media).execute()
    else:
        caption = service.captions().insert(part='snippet', body={'snippet': {'videoId': video_id, 'language': 'en', 'name': 'English', 'isDraft': False}}, media_body=media).execute()
    receipt['captionId'] = caption['id']
    receipt['captionStatus'] = caption.get('snippet', {}).get('status')
    upload.write_receipt(path, receipt)
    print('Pista English subida: ' + str(receipt['captionStatus']))
    if args.publish:
        video = service.videos().list(part='snippet,status,processingDetails', id=video_id).execute()['items'][0]
        if video.get('processingDetails', {}).get('processingStatus') != 'succeeded':
            print('Vídeo aún no procesado; se conserva privado.')
        else:
            status = {k: video['status'][k] for k in STATUS_KEYS if k in video['status']}
            status['privacyStatus'] = 'public'
            try:
                result = service.videos().update(part='status', body={'id': video_id, 'status': status}).execute()
                receipt['publicationResponsePrivacy'] = result['status']['privacyStatus']
                print('Respuesta de publicación: ' + receipt['publicationResponsePrivacy'])
            except HttpError as exc:
                receipt['publicationError'] = safe_error(exc)
                print('Publicación rechazada: ' + json.dumps(receipt['publicationError']))
            upload.write_receipt(path, receipt)
    final = service.videos().list(part='snippet,status,processingDetails', id=video_id).execute()['items'][0]
    receipt['privacy'] = final['status']['privacyStatus']
    receipt['verification'] = {
        'channelId': final['snippet']['channelId'], 'privacy': receipt['privacy'],
        'uploadStatus': final['status'].get('uploadStatus'),
        'processingStatus': final.get('processingDetails', {}).get('processingStatus'),
    }
    captions = service.captions().list(part='snippet', videoId=video_id).execute().get('items', [])
    receipt['captionStatus'] = next((c['snippet'].get('status') for c in captions if c['id'] == receipt['captionId']), None)
    upload.write_receipt(path, receipt)
    print('Verificación: ' + json.dumps(receipt['verification']))
    print('Subtítulos: ' + str(receipt['captionStatus']))
    print('Vídeo: https://youtu.be/' + video_id)


if __name__ == '__main__':
    try:
        main()
    except HttpError as exc:
        print('API: ' + json.dumps(safe_error(exc)))
        raise SystemExit(1)
    except Exception as exc:
        print('Operación interrumpida: ' + type(exc).__name__ + '; no se muestran secretos.')
        raise SystemExit(1)
