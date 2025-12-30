# 성좌넷 랜딩 페이지 - 순수 HTML/CSS/JavaScript 버전

이 폴더는 React 없이 순수 HTML, CSS, JavaScript로 구현된 랜딩 페이지입니다.

## 파일 구조

```
vanilla/
├── index.html          # 메인 HTML 파일
├── css/
│   └── style.css       # 모든 스타일 (Tailwind 없이 순수 CSS)
├── js/
│   └── main.js         # 모든 JavaScript 로직
├── assets/             # 이미지 파일들
│   ├── logo.png
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
   - ⚠️ 일부 기능(예: CORS)이 제한될 수 있습니다.

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
- 웹 서비스: `cta-web-link` 클래스

## 배포

이 버전은 정적 파일만 포함하므로 다음 플랫폼에 배포할 수 있습니다:

- GitHub Pages
- Netlify
- Vercel
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

