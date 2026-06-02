import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "herencia.db"));

const tickers = [
  // ── 국내주식 KOSPI ──
  { ticker: "005930", name: "삼성전자",      type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "000660", name: "SK하이닉스",    type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "207940", name: "삼성바이오로직스", type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "005380", name: "현대차",        type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "000270", name: "기아",          type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "068270", name: "셀트리온",      type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "051910", name: "LG화학",        type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "035420", name: "NAVER",         type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "028260", name: "삼성물산",      type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "012330", name: "현대모비스",    type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "066570", name: "LG전자",        type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "003550", name: "LG",            type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "032830", name: "삼성생명",      type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "086790", name: "하나금융지주",  type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "105560", name: "KB금융",        type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "055550", name: "신한지주",      type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "000810", name: "삼성화재",      type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "096770", name: "SK이노베이션",  type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "017670", name: "SK텔레콤",      type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "030200", name: "KT",            type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "003490", name: "대한항공",      type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "010950", name: "S-Oil",         type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "034730", name: "SK",            type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "015760", name: "한국전력",      type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "009150", name: "삼성전기",      type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "018260", name: "삼성에스디에스", type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "011200", name: "HMM",           type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "024110", name: "기업은행",      type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "316140", name: "우리금융지주",  type: "STOCK_KR", currency: "KRW", market: "KOSPI" },
  { ticker: "139480", name: "이마트",        type: "STOCK_KR", currency: "KRW", market: "KOSPI" },

  // ── 국내주식 KOSDAQ ──
  { ticker: "035720", name: "카카오",        type: "STOCK_KR", currency: "KRW", market: "KOSDAQ" },
  { ticker: "247540", name: "에코프로비엠",  type: "STOCK_KR", currency: "KRW", market: "KOSDAQ" },
  { ticker: "086900", name: "메디톡스",      type: "STOCK_KR", currency: "KRW", market: "KOSDAQ" },
  { ticker: "196170", name: "알테오젠",      type: "STOCK_KR", currency: "KRW", market: "KOSDAQ" },
  { ticker: "091990", name: "셀트리온헬스케어", type: "STOCK_KR", currency: "KRW", market: "KOSDAQ" },
  { ticker: "263750", name: "펄어비스",      type: "STOCK_KR", currency: "KRW", market: "KOSDAQ" },
  { ticker: "214150", name: "클래시스",      type: "STOCK_KR", currency: "KRW", market: "KOSDAQ" },
  { ticker: "041510", name: "에스엠",        type: "STOCK_KR", currency: "KRW", market: "KOSDAQ" },
  { ticker: "035900", name: "JYP Ent.",      type: "STOCK_KR", currency: "KRW", market: "KOSDAQ" },
  { ticker: "122870", name: "와이지엔터테인먼트", type: "STOCK_KR", currency: "KRW", market: "KOSDAQ" },
  { ticker: "323410", name: "카카오뱅크",    type: "STOCK_KR", currency: "KRW", market: "KOSDAQ" },
  { ticker: "377300", name: "카카오페이",    type: "STOCK_KR", currency: "KRW", market: "KOSDAQ" },
  { ticker: "251270", name: "넷마블",        type: "STOCK_KR", currency: "KRW", market: "KOSDAQ" },
  { ticker: "036570", name: "엔씨소프트",    type: "STOCK_KR", currency: "KRW", market: "KOSDAQ" },
  { ticker: "112040", name: "위메이드",      type: "STOCK_KR", currency: "KRW", market: "KOSDAQ" },

  // ── 미국주식 ──
  { ticker: "AAPL",  name: "Apple",          type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "MSFT",  name: "Microsoft",      type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "NVDA",  name: "NVIDIA",         type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "AMZN",  name: "Amazon",         type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "GOOGL", name: "Alphabet (A)",   type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "META",  name: "Meta",           type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "TSLA",  name: "Tesla",          type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "AVGO",  name: "Broadcom",       type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "TSM",   name: "TSMC",           type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "ORCL",  name: "Oracle",         type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "NFLX",  name: "Netflix",        type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "AMD",   name: "AMD",            type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "INTC",  name: "Intel",          type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "QCOM",  name: "Qualcomm",       type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "TXN",   name: "Texas Instruments", type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "JPM",   name: "JPMorgan Chase", type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "GS",    name: "Goldman Sachs",  type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "BAC",   name: "Bank of America", type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "V",     name: "Visa",           type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "MA",    name: "Mastercard",     type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "BRK-B", name: "Berkshire B",    type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "JNJ",   name: "Johnson & Johnson", type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "UNH",   name: "UnitedHealth",   type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "LLY",   name: "Eli Lilly",      type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "PFE",   name: "Pfizer",         type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "ABBV",  name: "AbbVie",         type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "XOM",   name: "ExxonMobil",     type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "CVX",   name: "Chevron",        type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "WMT",   name: "Walmart",        type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "COST",  name: "Costco",         type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "DIS",   name: "Disney",         type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "SBUX",  name: "Starbucks",      type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "CRM",   name: "Salesforce",     type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "ADBE",  name: "Adobe",          type: "STOCK_US", currency: "USD", market: "NASDAQ" },
  { ticker: "NOW",   name: "ServiceNow",     type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "PLTR",  name: "Palantir",       type: "STOCK_US", currency: "USD", market: "NYSE" },
  { ticker: "COIN",  name: "Coinbase",       type: "STOCK_US", currency: "USD", market: "NASDAQ" },

  // ── ETF ──
  { ticker: "SPY",   name: "SPDR S&P 500",   type: "ETF", currency: "USD", market: "NYSE" },
  { ticker: "QQQ",   name: "Invesco QQQ (NASDAQ-100)", type: "ETF", currency: "USD", market: "NASDAQ" },
  { ticker: "VTI",   name: "Vanguard Total Market", type: "ETF", currency: "USD", market: "NYSE" },
  { ticker: "VOO",   name: "Vanguard S&P 500", type: "ETF", currency: "USD", market: "NYSE" },
  { ticker: "IVV",   name: "iShares S&P 500", type: "ETF", currency: "USD", market: "NASDAQ" },
  { ticker: "ARKK",  name: "ARK Innovation",  type: "ETF", currency: "USD", market: "NYSE" },
  { ticker: "SOXL",  name: "SOXL 반도체 3배", type: "ETF", currency: "USD", market: "NYSE" },
  { ticker: "TQQQ",  name: "TQQQ QQQ 3배",    type: "ETF", currency: "USD", market: "NASDAQ" },
  { ticker: "GLD",   name: "SPDR Gold",       type: "ETF", currency: "USD", market: "NYSE" },
  { ticker: "TLT",   name: "iShares 20Y Treasury", type: "ETF", currency: "USD", market: "NASDAQ" },

  // ── 가상화폐 ──
  { ticker: "BTC",   name: "비트코인",        type: "CRYPTO", currency: "USD", market: "CRYPTO" },
  { ticker: "ETH",   name: "이더리움",        type: "CRYPTO", currency: "USD", market: "CRYPTO" },
  { ticker: "XRP",   name: "리플",            type: "CRYPTO", currency: "USD", market: "CRYPTO" },
  { ticker: "SOL",   name: "솔라나",          type: "CRYPTO", currency: "USD", market: "CRYPTO" },
  { ticker: "BNB",   name: "바이낸스코인",    type: "CRYPTO", currency: "USD", market: "CRYPTO" },
  { ticker: "DOGE",  name: "도지코인",        type: "CRYPTO", currency: "USD", market: "CRYPTO" },
  { ticker: "ADA",   name: "에이다",          type: "CRYPTO", currency: "USD", market: "CRYPTO" },
];

const stmt = db.prepare(`
  INSERT INTO TickerMaster (ticker, name, type, currency, market)
  VALUES (@ticker, @name, @type, @currency, @market)
  ON CONFLICT(ticker) DO UPDATE SET
    name = excluded.name,
    type = excluded.type,
    currency = excluded.currency,
    market = excluded.market
`);

const insertMany = db.transaction((rows) => {
  for (const row of rows) stmt.run(row);
});

insertMany(tickers);
console.log(`✓ ${tickers.length}개 티커 마스터 등록 완료`);
db.close();
