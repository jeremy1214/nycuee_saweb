import type { ResourceCategory, ResourceSlug } from "../resourceTypes";

export const resourceOrder: ResourceSlug[] = [
  "courses",
  "scholarships",
  "exchange",
  "graduate",
];

export const resourceCategories: Record<ResourceSlug, ResourceCategory> = {
  courses: {
    slug: "courses",
    tabLabel: "關於修課",
    eyebrow: "COURSE PLANNING",
    title: "把四年的選擇，整理成清楚的學習路徑",
    intro:
      "先確認所屬組別與入學年度，再從必修、專業選修與特色領域安排每學期課程。這裡整理判讀順序，正式學分認定仍以系所與教務處公告為準。",
    focus: "建議每學期選課前重新核對修業規定與開課資訊，避免沿用不同入學年度的課表。",
    cards: [
      {
        eyebrow: "01 · REQUIREMENTS",
        title: "先讀懂畢業與必修規定",
        description: "不同組別、入學年度可能適用不同必修科目表，先確認自己的版本再規劃。",
        points: ["核對入學年度與甲、乙、丙組", "盤點共同必修、專業必修與實驗課", "留意先修課程、擋修與畢業門檻"],
      },
      {
        eyebrow: "02 · DIRECTION",
        title: "用 15 個特色領域探索方向",
        description: "從興趣與想解決的問題出發，不必一開始就把自己限制在單一領域。",
        points: ["晶片、半導體、類比與電子設計自動化", "通訊、訊號、資訊通訊與無線科技", "控制、AI、機器人、生醫、電力與感測元件"],
      },
      {
        eyebrow: "03 · SYSTEMS",
        title: "選課前完成三方核對",
        description: "修業規定說明要修什麼，課程時間表說明本學期開什麼，選課系統才是實際加退選入口。",
        points: ["查看系所修業規定", "查詢當學期課號、時間與授課教師", "由單一入口進入一般選課系統"],
      },
    ],
    stepsTitle: "每學期選課流程",
    steps: [
      { title: "盤點進度", description: "比對必修科目表與已取得學分，列出本學期優先課程。" },
      { title: "安排方向", description: "依興趣選擇特色領域課程，同時檢查先修條件與課程衝堂。" },
      { title: "查詢開課", description: "在課程時間表確認課號、教室、容量與授課教師。" },
      { title: "完成選課", description: "由單一入口進入選課系統，並在加退選後再次核對結果。" },
    ],
    checklistTitle: "選課前檢查",
    checklist: ["確認入學年度與組別", "查看必修及專業實驗完成狀態", "確認先修與擋修條件", "預留通識、外語與校共同課程", "需要時諮詢導師或系辦"],
    links: [
      { label: "電機系完整修課規定", description: "必修課表、修業細則、雙主修與輔系辦法", href: "https://dee.nycu.edu.tw/pages.php?locale=tw&pa=stu_college_elective" },
      { label: "教務處學期選課", description: "選課說明、課程查詢與常見問題", href: "https://www.nycu.edu.tw/aa/ch/app/artwebsite/view?id=4487&module=artwebsite&serno=c836c23c-8452-4cc5-b7c9-df07f4a18537" },
      { label: "課程時間表", description: "依學期、系所及課程條件查詢開課資訊", href: "https://timetable.nycu.edu.tw/" },
    ],
  },
  scholarships: {
    slug: "scholarships",
    tabLabel: "獎助學金",
    eyebrow: "SCHOLARSHIPS",
    title: "先分清類型，再準備一份可以重複使用的申請資料",
    intro:
      "獎助機會分散在系所、學校與國際事務處。建立固定的資料夾與檢查清單，可以在公告期間快速判斷資格並完成申請。",
    focus: "金額、名額、資格與截止時間可能逐期調整，本頁不轉載期限，請以官方最新公告為準。",
    cards: [
      {
        eyebrow: "DEPARTMENT",
        title: "系級獎學金",
        description: "通常聚焦學業表現、研究成果、清寒扶助或特定捐贈宗旨。",
        points: ["確認適用年級與身分", "查看是否需要導師或系所推薦", "留意服務紀錄或成果報告要求"],
      },
      {
        eyebrow: "UNIVERSITY",
        title: "校級獎助與就學支持",
        description: "涵蓋書卷獎、弱勢助學、急難救助與各類校外基金會公告。",
        points: ["定期查看學務處與系所轉知", "確認能否與其他獎助重複領取", "依公告指定單位與方式送件"],
      },
      {
        eyebrow: "GLOBAL",
        title: "出國與交換獎學金",
        description: "通常須先取得交換、雙聯、短期課程或海外實習資格，再申請對應補助。",
        points: ["先完成交換或海外計畫甄選", "準備語言證明與研修計畫", "確認返國成果與核銷義務"],
      },
    ],
    stepsTitle: "申請準備節奏",
    steps: [
      { title: "每月查看公告", description: "固定查看系所、學務處與國際事務處，避免只依賴轉傳訊息。" },
      { title: "快速判讀資格", description: "先核對身分、年級、成績、經濟條件與是否可重複領取。" },
      { title: "建立共用資料包", description: "預先準備成績單、在學證明、自傳與常用佐證文件。" },
      { title: "送件後留存", description: "保留申請表、附件版本與收件紀錄，並追蹤結果與後續義務。" },
    ],
    checklistTitle: "常見申請文件",
    checklist: ["申請表與個人基本資料", "歷年成績單與在學證明", "自傳、讀書或研究計畫", "推薦信或導師簽章", "清寒、語言或成果證明"],
    links: [
      { label: "電機系最新消息", description: "查看系級獎學金與校外獎助轉知", href: "https://dee.nycu.edu.tw/news.php?locale=tw" },
      { label: "國際事務處出國獎學金", description: "交換、雙聯、實習與短期課程相關補助", href: "https://www.nycu.edu.tw/oia/ch/app/data/list?id=716&module=nycu0007" },
      { label: "學生事務處", description: "就學支持、生活輔導與校級獎助資訊", href: "https://osa.nycu.edu.tw/" },
    ],
  },
  exchange: {
    slug: "exchange",
    tabLabel: "交換資訊",
    eyebrow: "STUDY ABROAD",
    title: "把交換申請拆成一條可管理的時間軸",
    intro:
      "交換不只是在截止日前填表。從語言能力、校內甄選、志願排序到學分與財務規劃，每一步都會影響最後的選擇。",
    focus: "姐妹校名額、語言門檻與梯次每期可能不同，選校時必須同時核對當期名額表及對方學校資訊。",
    cards: [
      {
        eyebrow: "ELIGIBILITY",
        title: "資格與語言準備",
        description: "提早確認校內成績、排名、語言檢定及交換期間的在學身分要求。",
        points: ["查看當梯次校內甄選簡章", "安排語言考試並保留正式成績", "確認欲申請學校的額外門檻"],
      },
      {
        eyebrow: "APPLICATION",
        title: "校內甄選與選校",
        description: "利用名額表與 fact sheet 比較學期、課程、住宿、費用及學校限制。",
        points: ["準備自傳與研修計畫", "依自身條件安排志願順序", "完成線上申請與簽核文件"],
      },
      {
        eyebrow: "AFTER NOMINATION",
        title: "提名後的行前規劃",
        description: "獲得校內資格後仍需完成對方學校申請、簽證、保險與學分認定。",
        points: ["按姐妹校期限完成申請", "辦理選課與學分認定", "規劃簽證、住宿、機票與保險"],
      },
    ],
    stepsTitle: "交換準備時間軸",
    steps: [
      { title: "提前 12–18 個月", description: "探索國家與學校，準備語言檢定並檢視成績條件。" },
      { title: "校內甄選期間", description: "閱讀當期簡章、名額表及 fact sheet，完成志願與申請文件。" },
      { title: "取得提名後", description: "申請姐妹校、住宿與獎學金，同步處理學分認定。" },
      { title: "出國前與返國後", description: "完成簽證保險與行前程序，返國後繳交成績及成果資料。" },
    ],
    checklistTitle: "交換申請檢查",
    checklist: ["歷年成績單與排名資料", "有效語言能力證明", "自傳與研修計畫", "志願校課程及學分對照", "財務、住宿與簽證規劃"],
    links: [
      { label: "國際事務處", description: "最新出國交換公告、簡章與名額資訊", href: "https://www.nycu.edu.tw/oia/ch/index" },
      { label: "出國交換公告", description: "依梯次查看校內甄選與申請說明", href: "https://www.nycu.edu.tw/oia/ch/app/data/list?id=715&module=nycu0006" },
      { label: "出國獎學金", description: "交換、雙聯及海外學習補助資訊", href: "https://www.nycu.edu.tw/oia/ch/app/data/list?id=716&module=nycu0007" },
    ],
  },
  graduate: {
    slug: "graduate",
    tabLabel: "研究所",
    eyebrow: "GRADUATE STUDY",
    title: "從想研究的問題，反推研究所準備方向",
    intro:
      "研究所選擇不只看考科。先理解領域、實驗室與指導方式，再比較甄試、考試及校內銜接路徑，能更清楚地安排大學階段。",
    focus: "招生名額、考科與修業規章可能按學年度調整，申請前請以招生簡章及所屬班組公告為準。",
    cards: [
      {
        eyebrow: "PATHWAYS",
        title: "辨識適合的入學路徑",
        description: "甄試重視整體學習與研究潛力，考試入學著重指定科目，校內也可能有提前銜接方案。",
        points: ["碩士班甄試與考試入學", "學士班銜接碩士或五年一貫", "逕修博士與其他特殊管道"],
      },
      {
        eyebrow: "RESEARCH FIT",
        title: "比較領域與實驗室",
        description: "從研究題目、方法、設備、團隊文化及畢業發展評估適配程度。",
        points: ["閱讀教師近期研究與實驗室介紹", "參與專題、講座或實驗室說明", "準備具體問題與教授交流"],
      },
      {
        eyebrow: "PORTFOLIO",
        title: "累積可被理解的能力證據",
        description: "成績是基礎，專題、實作、競賽與研究經驗能更完整呈現你的準備。",
        points: ["整理核心課程與成績趨勢", "記錄專題中的問題、方法與貢獻", "建立履歷、讀書計畫與作品資料"],
      },
    ],
    stepsTitle: "升學準備順序",
    steps: [
      { title: "探索方向", description: "修讀基礎與特色領域課程，透過專題或講座觀察自己的興趣。" },
      { title: "蒐集資訊", description: "比較班組、教師、實驗室、修業規定與歷年招生方式。" },
      { title: "準備申請", description: "依管道整理成績、履歷、讀書研究計畫、推薦信或考科。" },
      { title: "評估選擇", description: "綜合研究適配、指導方式、資源與生涯方向做最後決定。" },
    ],
    checklistTitle: "申請資料整理",
    checklist: ["歷年成績與核心課程表現", "履歷與讀書／研究計畫", "專題、作品或研究成果", "推薦信與教授聯繫紀錄", "招生簡章與各項期限"],
    links: [
      { label: "電機工程研究所修業規章", description: "查看不同學年度的碩博士班修業規定", href: "https://iece.dee.nycu.edu.tw/pages.php?locale=tw&pa=regulation" },
      { label: "電機系招生消息", description: "研究所招生與相關說明公告", href: "https://dee.nycu.edu.tw/news.php?locale=tw" },
      { label: "陽明交大招生資訊", description: "正式招生簡章、報名與錄取資訊", href: "https://exam.nycu.edu.tw/" },
    ],
  },
};

export function isResourceSlug(value: string | undefined): value is ResourceSlug {
  return resourceOrder.includes(value as ResourceSlug);
}
