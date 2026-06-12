# 스토릿 랜딩 페이지 - 순수 HTML/CSS/JavaScript 버전

이 폴더는 React 없이 순수 HTML, CSS, JavaScript로 구현된 랜딩 페이지입니다.

## 파일 구조

```
vanilla/
├── index.html          # 메인 HTML 파일
├── package.json        # Vercel 빌드: npm run build → js/config.js 생성
├── vercel.json         # buildCommand / outputDirectory
├── scripts/
│   └── write-supabase-config.mjs  # 환경 변수 → js/config.js
├── api/
│   └── sync-notion.mjs     # Supabase Webhook → Notion 사전등록 행 추가
├── css/
│   └── style.css       # 모든 스타일 (Tailwind 없이 순수 CSS)
├── js/
│   ├── main.js         # 앱 로직 (ES module)
│   ├── config.example.js  # Supabase 설정 예시
│   └── config.js     # 로컬 또는 빌드 생성 (git에 포함하지 않음)
├── assets/             # 이미지 파일들
│   ├── storit_logo.png
│   ├── main.png
│   ├── quiz.png
│   ├── rank.png
│   └── shop.png
└── README.md
```

## 사용 방법

### 로컬 서버 실행

1. **Python 사용 (권장)**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```

2. **Node.js 사용**
   ```bash
   npx http-server -p 8000
   ```

3. **VS Code Live Server 확장 사용**
   - `index.html` 파일을 우클릭
   - "Open with Live Server" 선택

4. **브라우저에서 직접 열기**
   - `index.html` 파일을 브라우저로 드래그 앤 드롭
   - ⚠️ ES 모듈·Supabase 연동은 **로컬 HTTP 서버**로 열어야 동작합니다 (`file://` 불가).

### Supabase 사전 예약

1. Supabase에서 `pre_registrations` 테이블과 RLS(anon INSERT)를 설정합니다.
2. **로컬 개발:** `js/config.example.js`를 복사해 `js/config.js`를 만들고 URL·anon 키를 넣거나, 아래처럼 빌드 스크립트로 생성합니다.
   ```bash
   set SUPABASE_URL=https://xxx.supabase.co
   set SUPABASE_ANON_KEY=your-anon-key
   npm run build
   ```
   (PowerShell이면 `$env:SUPABASE_URL="..."` 형식 사용.)
3. 테이블에 `email` 컬럼이 있어야 하며, 컬럼명이 다르면 Supabase 쪽을 맞추거나 프론트 insert 필드를 조정합니다.

### Vercel 배포와 환경 변수

1. Vercel 프로젝트 **Settings → Environment Variables**에 다음 이름으로 추가합니다. (이름을 정확히 맞춥니다.)
   - `SUPABASE_URL` — Supabase Project URL
   - `SUPABASE_ANON_KEY` — anon public 키
   - (선택) `PREORDER_TABLE` — 기본값 `pre_registrations`
2. **Production**(및 필요 시 Preview)에 체크한 뒤 저장하고 재배포합니다.
3. 배포 시 `npm run build`가 `scripts/write-supabase-config.mjs`를 실행해 **`js/config.js`를 생성**합니다. 프리뷰/미리보기에서도 사전 예약을 쓰려면 Preview 환경에 동일 변수를 넣어야 합니다.

### Notion 사전등록 연동 (등록마다 새 행 추가)

사전 예약이 Supabase에 저장되면 Vercel API가 Notion DB에 **등록 1건당 새 행**을 추가합니다.

| Notion 속성 | 값 |
|-------------|-----|
| **일시** (Title) | KST `MM.DD` (예: `06.12`) |
| **등록(Email)** | 등록 이메일 |
| **등록일시** | KST 등록 시각 |

#### Vercel 환경 변수 (추가)

| 변수 | 설명 |
|------|------|
| `NOTION_TOKEN` | Notion Integration 토큰 (`ntn_...` 또는 `secret_...`) |
| `NOTION_DATABASE_ID` | 사전등록 목록 DB ID (32자) 또는 Notion DB URL |
| `SUPABASE_WEBHOOK_SECRET` | (권장) Webhook 인증용 임의 문자열 |

#### Supabase Database Webhook 설정

1. Supabase Dashboard → **Integrations → Database Webhooks**
2. **Table:** `pre_registrations` / **Events:** `INSERT`만 선택
3. **Type:** HTTP Request
4. **URL:** `https://<your-vercel-domain>/api/sync-notion`
5. **HTTP Headers** (권장):
   - `Authorization`: `Bearer <SUPABASE_WEBHOOK_SECRET>` (Vercel env와 동일한 값)
6. 저장 후 Vercel **재배포**

#### Notion 쪽 준비

- **사전등록 목록** DB에 Integration 연결
- 속성: `일시` (Title), `등록(Email)` (Email), `등록일시` (Date)

#### 동작 요약

```
사전등록 INSERT → Supabase Webhook → /api/sync-notion
  → Notion에 일시 / 등록(Email) / 등록일시 새 행 생성
```

### 접속

브라우저에서 `http://localhost:8000` 접속

## 주요 기능

- ✅ 반응형 디자인
- ✅ 스무스 스크롤 네비게이션
- ✅ 헤더 스크롤 감지
- ✅ 모바일 메뉴 토글
- ✅ 모든 섹션 네비게이션
- ✅ 애니메이션 효과
- ✅ 외부 링크 연결 (Instagram, Email, 웹 서비스)

## React 버전과의 차이점

1. **컴포넌트 구조**: React 컴포넌트가 순수 HTML 섹션으로 변환됨
2. **상태 관리**: `useState` → 일반 JavaScript 변수 + DOM 조작
3. **이벤트 리스너**: `useEffect` → `addEventListener`
4. **아이콘**: `lucide-react` → 인라인 SVG
5. **스타일링**: Tailwind CSS → 순수 CSS

## 커스터마이징

### 색상 변경
`css/style.css` 파일의 `:root` 변수를 수정하세요:
```css
:root {
    --color-service-name: #FDBB25;
    --color-yellow-400: #facc15;
    /* ... */
}
```

### 링크 수정
`index.html` 파일에서 직접 링크를 수정할 수 있습니다:
- Instagram: `footer-social` 섹션
- Email: `mailto:szn.helpdesk@gmail.com`

## 배포

이 버전은 정적 파일만 포함하므로 다음 플랫폼에 배포할 수 있습니다:

- GitHub Pages
- Netlify
- Vercel (`package.json`의 `build`로 Supabase 설정 생성 — 위 **Vercel 배포와 환경 변수** 참고)
- AWS S3 + CloudFront
- 기타 정적 호스팅 서비스

## 브라우저 호환성

- Chrome (최신)
- Firefox (최신)
- Safari (최신)
- Edge (최신)

## 참고사항

- Unicorn Studio 애니메이션은 외부 스크립트를 사용합니다.
- Google Fonts (Noto Sans KR)를 사용합니다.
- 모든 이미지는 `assets/` 폴더에 있습니다.

