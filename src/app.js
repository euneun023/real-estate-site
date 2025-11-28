const express = require('express');
const path = require('path');
const axios = require("axios");
const app = express();

// 뷰 엔진 EJS 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일 제공 (public 폴더)
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    res.render('listings/p-b-list');
  });

  // 빌딩·상가 리스트 페이지
  app.get('/building', (req, res) => {
    res.render('listings/b-s-list');
  });

  // 시행부지 리스트 페이지
  app.get('/site', (req, res) => {
    res.render('listings/is-list');
  });

  // 기타 부동산 리스트 페이지
  app.get('/etc', (req, res) => {
    res.render('listings/etc-list');
  });

// 고객지원 (매물 의뢰목록, 판매서/구매서 작성, 전하고 싶은 소식)
  app.get('/support', (req, res) => {
    res.render('listings/support');
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

  app.get("/register", (req, res) => {
    res.render("register");
  });
  

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

app.post("/api/land/autofill", async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
    const address = req.body.address;
    if (!address) {
      return res.status(400).json({ error: "주소가 없습니다." });
    }

    // -------------------------------------
    // 1) 도로명주소 → 지번/PNU 정보 획득
    // -------------------------------------
    const jusoRes = await axios.get("https://business.juso.go.kr/addrlink/addrLinkApi.do", {
      params: {
        confmKey: process.env.JUSO_KEY,
        currentPage: 1,
        countPerPage: 1,
        keyword: address,
        resultType: "json"
      }
    });

    if (!jusoRes.data?.results?.juso?.length) {
      return res.status(400).json({ error: "주소 검색 실패 (도로명주소 API)" });
    }

    const j = jusoRes.data.results.juso[0];
    const bjdongCd = j.admCd;
    const bun = j.lnbrMnnm.padStart(4, "0");
    const ji = j.lnbrSlno.padStart(4, "0");
    const pnu = `${bjdongCd}${bun}${ji}`;

    // -------------------------------------
    // 공통 VWorld 요청함수
    // -------------------------------------
    async function vworld(dataName) {
      const result = await axios.get("https://api.vworld.kr/req/data", {
        params: {
          service: "data",
          request: "GetFeature",
          data: dataName,
          key: process.env.VWORLD_KEY,
          domain: process.env.DOMAIN,
          attrFilter: `pnu:=:${pnu}`,
          format: "json"
        },
        validateStatus: () => true
      });

      // JSON이 아닌 HTML 응답일 때 방어
      if (typeof result.data === "string" && result.data.startsWith("<")) {
        console.log("HTML 응답 감지:", dataName);
        return null;
      }

      return result.data?.response?.result?.featureCollection?.features?.[0]?.properties || null;
    }

    // -------------------------------------
    // 2) 건축물대장
    // -------------------------------------
    // 정확한 VWorld 레이어명: 건축물대장 표제부
    const building = await vworld("LT_B_ILD");  

    // -------------------------------------
    // 3) 개별공시지가
    // -------------------------------------
    // 정확한 레이어명: 토지 개별공시지가 속성도 동일함
    const price = await vworld("LT_P_SDW_LANDPRICE"); 

    // -------------------------------------
    // 4) 토지이용계획
    // -------------------------------------
    const land = await vworld("LT_C_LUPIS");

    // -------------------------------------
    // 최종 응답
    // -------------------------------------
    return res.json({
      success: true,
      pnu,
      building: building || {},
      price: price || {},
      land: land || {}
    });

  } catch (e) {
    console.error("🔥 API ERROR:", e);
    return res.status(500).json({
      error: "서버 조회 실패",
      detail: e.message
    });
  }
});
