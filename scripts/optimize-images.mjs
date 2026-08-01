/**
 * assets/의 큰 PNG를 화면 표시 크기에 맞춰 줄이고 WebP로 변환한다.
 * 에셋을 교체하거나 추가했을 때만 수동으로 돌린다.
 *
 *   npm install --no-save sharp
 *   node scripts/optimize-images.mjs
 *
 * width는 "가장 크게 그려지는 곳" 기준이다. 문항 일러스트는 288x176 박스에
 * object-fit: cover로 들어가므로 3배 밀도를 감안해 864px면 충분하다.
 */

import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ASSETS = path.join(process.cwd(), 'assets');

/** @type {{ files: string[], width: number | null, quality: number }[]} */
const TARGETS = [
    // 성향 테스트 문항 일러스트 (288x176 박스, object-fit: cover)
    { files: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'], width: 864, quality: 80 },
    // 결과 마스코트 (모달 224px, 공유 카드 400px)
    {
        files: ['romance', 'fantasy', 'action', 'thriller', 'slice', 'muhyeop', 'mascot'],
        width: 800,
        quality: 82,
    },
    // 공유 카드 상단 로고 마크 (92px로 그려짐)
    { files: ['logo_cookie'], width: 256, quality: 90 },
    // 랜딩 폰 목업 (이미 1배 크기라 리사이즈 없이 재인코딩만)
    { files: ['main', 'quiz', 'shop', 'rank'], width: null, quality: 82 },
];

const KB = (bytes) => `${(bytes / 1024).toFixed(0)}KB`;

async function main() {
    const before = await totalSize();
    let converted = 0;

    for (const { files, width, quality } of TARGETS) {
        for (const name of files) {
            const src = path.join(ASSETS, `${name}.png`);
            const dst = path.join(ASSETS, `${name}.webp`);

            let srcSize;
            try {
                srcSize = (await stat(src)).size;
            } catch {
                console.warn(`skip ${name}.png (없음)`);
                continue;
            }

            const pipeline = sharp(src);
            if (width) pipeline.resize({ width, withoutEnlargement: true });
            const { size } = await pipeline.webp({ quality, effort: 6 }).toFile(dst);

            const saved = (100 - (size / srcSize) * 100).toFixed(1);
            console.log(`${name.padEnd(14)} ${KB(srcSize).padStart(8)} → ${KB(size).padStart(7)}  (-${saved}%)`);

            await unlink(src);
            converted += 1;
        }
    }

    const after = await totalSize();
    console.log(`\n${converted}개 변환. assets 전체 ${KB(before)} → ${KB(after)}`);
}

async function totalSize() {
    const names = await readdir(ASSETS);
    const sizes = await Promise.all(names.map((n) => stat(path.join(ASSETS, n)).then((s) => s.size)));
    return sizes.reduce((a, b) => a + b, 0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
