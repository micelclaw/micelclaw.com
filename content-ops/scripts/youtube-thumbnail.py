#!/usr/bin/env python3
"""Set the existing thumbnail for a known upload; no publication or deletion."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

spec = importlib.util.spec_from_file_location('upload', Path(__file__).with_name('youtube-upload-private.py'))
upload = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upload)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--item', choices=['ep4-contacts', 'ep4-contacts-short', 'ep5-mail', 'ep5-mail-short'], required=True)
    parser.add_argument('--image', type=Path, required=True)
    args = parser.parse_args()
    upload.validate_client()
    path = upload.CONFIG / 'uploads' / (args.item + '.json')
    receipt = json.loads(path.read_text())
    if receipt.get('channelId') != upload.EXPECTED_CHANNEL or not receipt.get('id'):
        raise ValueError('Unknown channel/video')
    if not args.image.is_file() or args.image.suffix.lower() not in ('.jpg', '.jpeg', '.png'):
        raise ValueError('Invalid thumbnail file')
    digest = hashlib.sha256(args.image.read_bytes()).hexdigest()
    if receipt.get('thumbnailHash') == digest:
        print('[skip] Miniatura ya aplicada')
        return
    credentials = Credentials.from_authorized_user_file(str(upload.TOKEN))
    if not credentials.valid:
        credentials.refresh(Request())
        upload.save_token(credentials)
    service = build('youtube', 'v3', credentials=credentials, cache_discovery=False)
    result = service.thumbnails().set(
        videoId=receipt['id'], media_body=MediaFileUpload(str(args.image),
        mimetype='image/png' if args.image.suffix.lower() == '.png' else 'image/jpeg'),
    ).execute()
    receipt['thumbnailHash'] = digest
    receipt['thumbnailApplied'] = bool(result.get('items'))
    upload.write_receipt(path, receipt)
    print('Miniatura aplicada: ' + str(receipt['thumbnailApplied']))


if __name__ == '__main__':
    try:
        main()
    except HttpError as exc:
        print('API HTTP ' + str(exc.resp.status) + '; detalles sensibles omitidos.')
        raise SystemExit(1)
    except Exception as exc:
        print('Operación interrumpida: ' + type(exc).__name__)
        raise SystemExit(1)
