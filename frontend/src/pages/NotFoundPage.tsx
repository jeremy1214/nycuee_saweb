import { Link } from "react-router-dom";
import { PageContainer } from "../components/SiteChrome";

export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <PageContainer>
        <span className="error-code">404</span>
        <span className="eyebrow">PAGE NOT FOUND</span>
        <h1>這個頁面還沒有接上電路。</h1>
        <p>網址可能已更新，或內容仍在建置中。</p>
        <Link className="primary-button" to="/">返回首頁 <span aria-hidden="true">→</span></Link>
      </PageContainer>
    </main>
  );
}
