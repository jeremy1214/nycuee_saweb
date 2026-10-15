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
    searchDescription: "修課規定、選課系統與課程查詢官方連結，搭配選課流程與檢查清單。",
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
    searchDescription: "系級、校級與出國獎助學金官方連結，搭配申請流程與文件清單。",
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
    searchDescription: "出國交換公告與獎學金官方連結，搭配交換準備流程與申請清單。",
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
    searchDescription: "研究所修業規章與招生官方連結，搭配升學準備流程與申請資料清單。",
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
