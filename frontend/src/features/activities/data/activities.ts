import type { ActivityCategoryOption, ActivityItem } from "../activityTypes";

export const activityCategories: ActivityCategoryOption[] = [
  { label: "電機營", shortLabel: "EE CAMP" },
  { label: "系露營", shortLabel: "CAMPING" },
  { label: "電機週", shortLabel: "EE WEEK" },
  { label: "光舞", shortLabel: "LIGHT DANCE" },
  { label: "其他活動", shortLabel: "MORE" },
];

export const activities: ActivityItem[] = [
  {
    id: "smart-ee-camp",
    title: "智慧電機探索營：從電路到未來應用",
    date: "2026-10-14",
    category: "電機營",
    summary: "透過主題講解與動手實作，認識電機領域如何連結生活中的智慧科技。",
    details: "活動包含系所導覽、基礎電路實作與學長姐交流，讓參與者從觀察、設計到測試，體驗完整的工程思考過程。",
    location: "工程四館 101 講堂",
    detail: {
      eyebrow: "EE CAMP · LEARN BY MAKING",
      intro: [
        "電機營以高中生為主要對象，透過系所介紹、課程體驗與學長姐交流，帶參與者從生活中的科技開始認識電機領域。",
        "第一版內容聚焦硬體與軟體兩條實作路線，讓抽象概念能透過動手操作被看見，也保留團隊合作與提問交流的空間。",
      ],
      heroImages: [
        { src: "/intro/activities/one-day-camp.png", alt: "電機營課程與學員活動紀錄" },
        { src: "/intro/activities/one-day-camp-2.png", alt: "電機營學員團體合照" },
      ],
      sections: [
        {
          id: "hardware-course",
          navLabel: "硬體課程",
          eyebrow: "HARDWARE LAB",
          title: "從元件與電路開始，把原理做成作品",
          paragraphs: [
            "硬體課程從基本電子元件與電路觀念出發，帶領學員閱讀簡單線路、在麵包板上完成接線，並觀察輸入與輸出的變化。",
            "課程會以可實際操作的小型作品作為目標；正式材料、難度與成品將依當屆課程設計調整。",
          ],
          image: { src: "/intro/activities/hardware-course.jpg", alt: "硬體課程中的電路實作" },
        },
        {
          id: "software-course",
          navLabel: "軟體課程",
          eyebrow: "SOFTWARE LAB",
          title: "用程式拆解問題，完成第一次小實作",
          paragraphs: [
            "軟體課程從基礎語法與邏輯思考開始，透過循序示範與練習，讓沒有程式經驗的學員也能跟上操作。",
            "學員將把課堂概念組合成一個小實作，體驗從需求、嘗試到修正的工程思考過程。",
          ],
          image: { src: "/intro/activities/software-course.jpg", alt: "軟體課程中的程式實作" },
        },
      ],
    },
  },
  {
    id: "department-camping-night",
    title: "秋季系露營：在星光下認識彼此",
    date: "2026-10-18",
    category: "系露營",
    summary: "以小隊合作與戶外體驗拉近同學距離，在課堂之外建立共同回憶。",
    details: "規劃團隊任務、營火交流與戶外體驗，活動內容將依天候與場地狀況調整，完整行前資訊另行通知。",
    location: "校外活動場地",
    detail: {
      eyebrow: "EE CAMPING · GROW TOGETHER",
      intro: [
        "系露營以小隊合作與戶外體驗為主軸，讓同學在課堂之外認識彼此，透過共同任務建立默契與回憶。",
        "第一版先呈現預計包含的小隊活動、晚間交流與行前準備；實際流程仍會依場地、天候與當屆規劃調整。",
      ],
      heroImages: [
        { src: "/intro/activities/experience_3-1.png", alt: "學生在戶外進行晚間交流活動" },
        { src: "/intro/activities/experience_3-2.png", alt: "學生團體交流合照" },
      ],
      sections: [
        {
          id: "team-challenges",
          navLabel: "小隊任務",
          eyebrow: "TEAM CHALLENGES",
          title: "從破冰到合作，在任務中找到彼此的節奏",
          paragraphs: [
            "活動以小隊為單位安排破冰與合作任務，讓不同年級、不同背景的同學能自然展開對話。",
            "任務內容將兼顧參與感與安全性，正式關卡、分組方式及所需裝備會在行前通知中說明。",
          ],
          image: { src: "/intro/activities/experience_5-1.png", alt: "學生分組進行團隊交流" },
        },
        {
          id: "campfire-night",
          navLabel: "晚間交流",
          eyebrow: "CAMPFIRE NIGHT",
          title: "在夜色與笑聲裡，留下課堂之外的共同片段",
          paragraphs: [
            "晚間時段預計安排團體交流與輕鬆活動，讓白天累積的默契延續，也讓每位參與者有更多認識彼此的機會。",
            "是否能進行營火或戶外活動，將以場地規範、天候與安全評估為準。",
          ],
          image: { src: "/intro/activities/experience_3-1.png", alt: "學生在戶外手持仙女棒交流" },
        },
        {
          id: "camping-notes",
          navLabel: "行前資訊",
          eyebrow: "BEFORE YOU GO",
          title: "把交通、住宿與裝備一次整理清楚",
          paragraphs: [
            "正式報名後將統一提供集合方式、交通安排、住宿資訊、攜帶物品與緊急聯絡方式，方便參與者提前準備。",
            "本頁目前不列出尚未確認的日期與地點；請以系學會後續公告及行前通知為準。",
          ],
          image: { src: "/intro/activities/experience_3-2.png", alt: "參與學生留下團體合照" },
        },
      ],
    },
  },
  {
    id: "ee-week-showcase",
    title: "電機週：把日常好奇變成互動作品",
    date: "2026-10-22",
    category: "電機週",
    summary: "集結學生創作、知識展區與互動體驗，從不同角度看見電機的可能性。",
    details: "現場以主題展區呈現學生作品與電機知識，並安排短講及互動體驗，適合想認識系上學習內容的師生參加。",
    location: "浩然圖書館前廣場",
    detail: {
      eyebrow: "EE WEEK · IDEAS ON DISPLAY",
      intro: [
        "電機週把學生作品、系上特色與生活中的科技帶到校園公共空間，透過展覽與互動，讓更多人看見電機不只存在於課本與實驗室。",
        "第一版以主題展區、互動體驗及設計成果為內容主軸；各年度主題與展出項目將依當屆企劃更新。",
      ],
      heroImages: [
        { src: "/intro/activities/design.png", alt: "電機週設計成果展示" },
        { src: "/intro/activities/shirt_114.png", alt: "電機系服設計作品" },
      ],
      sections: [
        {
          id: "themed-exhibits",
          navLabel: "主題展區",
          eyebrow: "THEMED EXHIBITS",
          title: "把專業知識轉成容易靠近的校園展覽",
          paragraphs: [
            "主題展區以學生作品、電機知識與系上生活為素材，透過圖像、實物或短講整理成容易理解的內容。",
            "展出主題會依當年度企劃調整，正式項目與開放時段請以活動公告為準。",
          ],
          image: { src: "/intro/activities/social-posts.png", alt: "學生製作的活動主題視覺" },
        },
        {
          id: "interactive-experience",
          navLabel: "互動體驗",
          eyebrow: "TRY IT YOURSELF",
          title: "不只觀看，也能親手操作與提問",
          paragraphs: [
            "互動體驗希望降低接觸技術的門檻，讓參觀者透過簡單操作觀察作品如何回應，並與現場同學交流背後的想法。",
            "實際體驗內容、參加方式與是否需要預約，將在當屆活動資訊確認後更新。",
          ],
          image: { src: "/intro/activities/photography.png", alt: "學生記錄與參與校園活動" },
        },
        {
          id: "visual-design",
          navLabel: "設計成果",
          eyebrow: "VISUAL IDENTITY",
          title: "從主視覺到系服，讓每一屆留下自己的樣子",
          paragraphs: [
            "電機週的視覺不只用來宣傳，也會延伸到系服與活動小物，從概念發想、繪圖到實際製作，凝聚當屆活動的個性。",
            "頁面目前展示網站既有的設計素材；正式販售資訊、款式與尺寸將另行公告。",
          ],
          image: { src: "/intro/activities/shirt_114.png", alt: "電機系服正反面設計展示" },
        },
      ],
    },
  },
  {
    id: "light-dance-workshop",
    title: "光舞工作坊：用程式點亮舞台",
    date: "2026-10-28",
    category: "光舞",
    summary: "結合燈光控制、程式設計與舞台表演，共同完成一段可被看見的創作。",
    details: "從燈條控制基礎開始，分組設計燈光節奏並進行舞台整合。無相關經驗也可參加，器材與教學由活動團隊準備。",
    location: "活動中心二樓展演空間",
  },
  {
    id: "student-community-day",
    title: "電機生活交流日：社團、系隊與學習資源",
    date: "2026-11-05",
    category: "其他活動",
    summary: "一次認識系上社群與學生資源，找到課業之外也能投入的活動。",
    details: "由不同學生團隊介紹年度活動、參與方式與可使用的系上資源，現場也保留自由交流與提問時間。",
    location: "工程四館中庭",
  },
];
