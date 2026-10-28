import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buildSearchItems } from "../data/search";
import { useActivityContent, ActivityContentStatus } from "../../features/activities/data/ActivityContentProvider";
import { Modal } from "./ui/Modal";

function resultSnippet(content: string, description: string, query: string) {
  if (!query) return description;
  const index = content.toLocaleLowerCase("zh-Hant").indexOf(query);
  if (index < 0) return description;
  const start = Math.max(0, index - 32);
  const end = Math.min(content.length, index + query.length + 54);
  return `${start ? "…" : ""}${content.slice(start, end).trim()}${end < content.length ? "…" : ""}`;
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const content = useActivityContent();
  const searchItems = useMemo(() => buildSearchItems(content.data), [content.data]);
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("zh-Hant");
  const results = useMemo(() => {
    if (!normalized) return searchItems;
    return searchItems.filter((item) => item.content.toLocaleLowerCase("zh-Hant").includes(normalized))
      .sort((first, second) => {
        const rank = (item: typeof first) => item.label.toLocaleLowerCase("zh-Hant").includes(normalized) ? 0
          : item.description.toLocaleLowerCase("zh-Hant").includes(normalized) ? 1 : 2;
        return rank(first) - rank(second);
      });
  }, [normalized, searchItems]);

  return (
    <Modal open={open} title="搜尋系所資訊" onClose={onClose}>
      <label className="search-label" htmlFor="site-search">關鍵字</label>
      <input
        id="site-search"
        className="search-input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="輸入修課、獎學金、交換等關鍵字"
        autoFocus={open}
      />
      <div className="search-results" aria-live="polite">
        <ActivityContentStatus />
        {results.length > 0 ? results.map((item) => (
          <Link key={`${item.to}-${item.label}`} to={item.to} onClick={onClose}>
            <span><strong>{item.label}</strong><small>{resultSnippet(item.content, item.description, normalized)}</small></span>
            <span aria-hidden="true">→</span>
          </Link>
        )) : <p className="empty-state">沒有符合的項目，請試試其他關鍵字。</p>}
      </div>
    </Modal>
  );
}
