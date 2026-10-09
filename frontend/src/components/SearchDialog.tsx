import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { searchItems } from "../data/home";
import { Modal } from "./SiteChrome";

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("zh-Hant");
    if (!normalized) return searchItems;
    return searchItems.filter((item) =>
      `${item.label}${item.description}`.toLocaleLowerCase("zh-Hant").includes(normalized),
    );
  }, [query]);

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
        {results.length > 0 ? results.map((item) => (
          <Link key={item.label} to={item.to} onClick={onClose}>
            <span><strong>{item.label}</strong><small>{item.description}</small></span>
            <span aria-hidden="true">→</span>
          </Link>
        )) : <p className="empty-state">沒有符合的項目，請試試其他關鍵字。</p>}
      </div>
    </Modal>
  );
}
