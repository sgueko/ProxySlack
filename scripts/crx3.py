#!/usr/bin/env python3
"""Create and verify a CRX3 using Chromium's documented wire format."""
import argparse
import hashlib
import io
import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import zipfile

CONTEXT = b'CRX3 SignedData\0'


def varint(number):
    out = bytearray()
    while number > 127:
        out.append((number & 127) | 128)
        number >>= 7
    out.append(number)
    return bytes(out)


def field(number, data):
    return varint((number << 3) | 2) + varint(len(data)) + data


def read_varint(data, offset):
    result = 0
    for shift in range(0, 70, 7):
        if offset >= len(data): raise ValueError('Truncated protobuf')
        byte = data[offset]; offset += 1
        result |= (byte & 127) << shift
        if byte < 128: return result, offset
    raise ValueError('Oversized protobuf varint')


def fields(data):
    result = {}
    offset = 0
    while offset < len(data):
        tag, offset = read_varint(data, offset)
        if tag & 7 != 2: raise ValueError('Unexpected protobuf wire type')
        length, offset = read_varint(data, offset)
        if length > len(data) - offset: raise ValueError('Truncated protobuf field')
        result.setdefault(tag >> 3, []).append(data[offset:offset+length])
        offset += length
    return result


def public_der(key):
    return subprocess.check_output(['openssl', 'pkey', '-in', str(key), '-pubout', '-outform', 'DER'], stderr=subprocess.DEVNULL)


def extension_id(public_key):
    return ''.join(chr(ord('a') + int(nibble, 16)) for byte in hashlib.sha256(public_key).digest()[:16] for nibble in f'{byte:02x}')


def sign(key, archive, out):
    if key.stat().st_mode & 0o077: raise ValueError('Private key permissions must be 0600')
    pub = public_der(key)
    raw_id = hashlib.sha256(pub).digest()[:16]
    zip_bytes = archive.read_bytes()
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        if z.testzip(): raise ValueError('Invalid ZIP payload')
    signed_data = field(1, raw_id)
    signed_bytes = CONTEXT + struct.pack('<I', len(signed_data)) + signed_data + zip_bytes
    with tempfile.TemporaryDirectory() as temp:
        content = Path(temp) / 'signed.bin'
        content.write_bytes(signed_bytes)
        signature = subprocess.check_output(['openssl', 'dgst', '-sha256', '-sign', str(key), str(content)])
    proof = field(1, pub) + field(2, signature)
    header = field(2, proof) + field(10000, signed_data)
    if len(header) > 1 << 18: raise ValueError('CRX header too large')
    out.write_bytes(b'Cr24' + struct.pack('<II', 3, len(header)) + header + zip_bytes)
    verify(out, expected_key=key)
    return extension_id(pub)


def verify(crx, expected_key=None):
    data = crx.read_bytes()
    if len(data) < 12 or data[:4] != b'Cr24': raise ValueError('Missing CRX magic')
    version, header_size = struct.unpack('<II', data[4:12])
    if version != 3 or header_size > (1 << 18) or header_size > len(data)-12: raise ValueError('Invalid CRX3 header')
    header = fields(data[12:12+header_size])
    if len(header.get(2, [])) != 1 or len(header.get(10000, [])) != 1: raise ValueError('Missing CRX3 proof')
    proof = fields(header[2][0])
    if len(proof.get(1, [])) != 1 or len(proof.get(2, [])) != 1: raise ValueError('Invalid CRX3 proof')
    pub, signature = proof[1][0], proof[2][0]
    signed_data = header[10000][0]
    decoded = fields(signed_data)
    if decoded.get(1) != [hashlib.sha256(pub).digest()[:16]]: raise ValueError('CRX ID does not match public key')
    if expected_key and pub != public_der(expected_key): raise ValueError('Signing key mismatch')
    payload = data[12+header_size:]
    with zipfile.ZipFile(io.BytesIO(payload)) as z:
        if z.testzip(): raise ValueError('Invalid CRX ZIP payload')
    signed_bytes = CONTEXT + struct.pack('<I', len(signed_data)) + signed_data + payload
    with tempfile.TemporaryDirectory() as temp:
        temp = Path(temp)
        (temp/'public.der').write_bytes(pub)
        (temp/'signature').write_bytes(signature)
        (temp/'signed.bin').write_bytes(signed_bytes)
        result = subprocess.run(['openssl', 'dgst', '-sha256', '-verify', str(temp/'public.der'), '-keyform', 'DER', '-signature', str(temp/'signature'), str(temp/'signed.bin')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if result.returncode: raise ValueError('CRX signature verification failed')
    return extension_id(pub)


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='command', required=True)
    signer = sub.add_parser('sign')
    signer.add_argument('--key', type=Path, required=True)
    signer.add_argument('--zip', type=Path, required=True)
    signer.add_argument('--out', type=Path, required=True)
    verifier = sub.add_parser('verify')
    verifier.add_argument('--crx', type=Path, required=True)
    verifier.add_argument('--key', type=Path)
    args = parser.parse_args()
    print(sign(args.key, args.zip, args.out) if args.command == 'sign' else verify(args.crx, args.key))


if __name__ == '__main__':
    try: main()
    except (OSError, ValueError, subprocess.CalledProcessError, zipfile.BadZipFile) as error:
        print(f'CRX3 error: {error}', file=sys.stderr)
        raise SystemExit(1)
