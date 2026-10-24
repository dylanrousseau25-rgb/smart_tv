"""Génère app/icon.png (512x423, taille attendue par les TV Samsung) sans dépendance externe."""
import math
import os
import struct
import zlib

W, H = 512, 423
OUT = os.path.join(os.path.dirname(__file__), '..', 'app', 'icon.png')


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def inside_round_rect(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def pixel(x, y):
    # Fond : dégradé nuit -> coucher de soleil, coins arrondis
    if not inside_round_rect(x, y, 0, 0, W - 1, H - 1, 70):
        return (0, 0, 0, 0)
    t = y / H
    top, mid, bot = (36, 26, 68), (109, 53, 102), (242, 168, 101)
    rgb = lerp(top, mid, t * 2) if t < 0.5 else lerp(mid, bot, (t - 0.5) * 2)

    # Soleil
    if (x - 340) ** 2 + (y - 150) ** 2 <= 42 ** 2:
        return (255, 213, 74, 255)

    # Étagère en verre avec 3 tuiles
    if inside_round_rect(x, y, 70, 255, 442, 345, 28):
        rgb = lerp(rgb, (255, 255, 255), 0.18)
        for i in range(3):
            tx = 95 + i * 112
            if inside_round_rect(x, y, tx, 275, tx + 96, 325, 12):
                return (255, 255, 255, 255) if i == 0 else lerp(rgb, (255, 255, 255), 0.55) + (255,)

    # Collines (paysage de tableau)
    hill = 225 + 25 * math.sin(x / 70.0)
    if y > hill and y < 255:
        rgb = lerp(rgb, (20, 14, 40), 0.55)
    return rgb + (255,)


def write_png(path):
    raw = bytearray()
    for y in range(H):
        raw.append(0)
        for x in range(W):
            raw.extend(pixel(x, y))

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


if __name__ == '__main__':
    write_png(OUT)
    print('Icône écrite :', os.path.abspath(OUT))
