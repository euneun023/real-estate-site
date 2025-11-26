const express = require('express');
const path = require('path');

const app = express();

// 뷰 엔진 EJS 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일 제공 (public 폴더)
app.use(express.static(path.join(__dirname, '..', 'public')));

// 메인 페이지 라우트
app.get('/', (req, res) => {
  // views/main/index.ejs 렌더링
  res.render('main/index');
});

// 나중에: /list, /pension 등도 여기서 라우터로 분리 가능
// 호텔·모텔 리스트 페이지
app.get('/hotel', (req, res) => {
    res.render('listings/h-m-list');
  });
  
  // 펜션·풀빌라 리스트 페이지
  app.get('/pension', (req, res) => {
    res.render('listings/pension-list');
  });

  app.get('/detail/:id', (req, res) => {
    const id = req.params.id;
    const category = req.query.category || '';
  
    // TODO: 나중에 DB에서 id, category 기반으로 매물 데이터 조회
    res.render('listings/detail', {
      id,
      category,
    });
  });


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
