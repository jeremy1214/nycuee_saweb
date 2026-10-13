import { Link } from "react-router-dom";
import { socialLinks, siteContact } from "../../data/site";
import { SocialIcon } from "../ui/SocialIcon";
import { primaryNavigation } from "../../data/navigation";
import { Brand } from "./Brand";
import { PageContainer } from "./PageContainer";

export function SiteFooter() {
  return (
    <footer className="site-footer" id="contact">
      <PageContainer>
        <div className="footer-main">
          <Brand />
          <div className="footer-column">
            <h2>聯絡資訊</h2>
            <p>{siteContact.institution}</p>
            <a href={siteContact.website} target="_blank" rel="noreferrer">前往系所官方網站 ↗</a>
            <div className="footer-social-links" aria-label="交大電機社群平台">
              {socialLinks.map((social) => <a key={social.id} href={social.href} target="_blank" rel="noreferrer">
                <SocialIcon platform={social.id} />
                <span className="footer-social-label">{social.label}</span><span className="footer-social-arrow" aria-hidden="true">↗</span>
              </a>)}
            </div>
          </div>
          <div className="footer-column">
            <h2>網站導覽</h2>
            {primaryNavigation.map((page) => <Link key={page.to} to={page.to}>{page.title}</Link>)}
          </div>
        </div>
        <div className="footer-bottom">
          <span>交大電機系網站 · React 視覺實作</span>
          <span>資訊摘要僅供導覽，正式規定以官方公告為準</span>
        </div>
      </PageContainer>
    </footer>
  );
}
