interface PageFixture {
  id: string;
  status: string;
  links: { label: string; description: string; href: string }[];
  sections?: { id: string; type: string; title: string; items: unknown[] }[];
}

export function resourceFixture() {
  const config = {
    defaultCategory: "courses",
    categories: [
      { id: "courses", label: "關於修課", searchDescription: "修課資料" },
      { id: "scholarships", label: "獎助學金", searchDescription: "獎助資料" },
      { id: "exchange", label: "交換資訊", searchDescription: "交換資料" },
      { id: "graduate", label: "研究所", searchDescription: "研究所資料" },
    ],
  };
  const modules: Record<string, PageFixture> = Object.fromEntries(config.categories.map(({ id }) => [
    `pages/${id}.json`, {
      id, status: "published",
      links: Array.from({ length: 3 }, (_, index) => ({ label: `官方入口 ${index + 1}`, description: "測試用連結", href: `https://www.nycu.edu.tw/?source=${index + 1}` })),
      sections: [
        { id: "preparation", type: "process", title: "準備流程", items: [{ title: "第一步", description: "流程說明" }] },
        { id: "checklist", type: "checklist", title: "檢查清單", items: ["檢查項目"] },
      ],
    },
  ]));
  return { config, modules };
}

export type ResourceFixture = ReturnType<typeof resourceFixture>;

export function expandedResourceFixture() {
  const fixture = resourceFixture();
  const { config, modules } = fixture;
  for (const [id, label, status] of [
    ["additional", "延伸學習", "published"],
    ["draft-category", "草稿分類", "draft"],
    ["archived-category", "封存分類", "archived"],
  ]) {
    config.categories.push({ id, label, searchDescription: `${label}測試摘要` });
    modules[`pages/${id}.json`] = { id, status, links: structuredClone(modules["pages/courses.json"].links) };
  }
  const extra = modules["pages/additional.json"];
  extra.links.push({ label: "新增官方入口", description: "第四個連結", href: "https://www.nycu.edu.tw/" });
  extra.sections = [
    { id: "first-checklist", type: "checklist", title: "第一份清單", items: ["第一個項目"] },
    { id: "long-process", type: "process", title: "六步流程", items: Array.from({ length: 6 }, (_, index) => ({ title: `步驟 ${index + 1}`, description: "流程說明" })) },
    { id: "second-checklist", type: "checklist", title: "第二份清單", items: ["另一個項目"] },
    { id: "second-process", type: "process", title: "另一組流程", items: [{ title: "單一步驟", description: "流程說明" }] },
  ];
  config.defaultCategory = "additional";
  return fixture;
}
