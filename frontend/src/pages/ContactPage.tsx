import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageContainer } from "../components/SiteChrome";
import "./contact.css";

const contactEmail = "eesa@nycu.edu.tw";

type SubmissionStatus = "idle" | "submitting" | "success" | "error" | "unavailable";

export default function ContactPage() {
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const endpoint = import.meta.env.VITE_CONTACT_FORM_ENDPOINT?.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!endpoint) {
      setStatus("unavailable");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    // Quietly accept submissions filled by simple bots through the hidden field.
    if (formData.get("website")) {
      form.reset();
      setStatus("success");
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          category: formData.get("category"),
          subject: formData.get("subject"),
          message: formData.get("message"),
          source: "nycu-ee-website",
          submittedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error(`Contact form returned ${response.status}`);

      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="contact-page">
      <PageContainer>
        <nav className="section-breadcrumb" aria-label="所在位置">
          <Link to="/">首頁</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">聯絡我們</span>
        </nav>

        <section className="contact-hero" aria-labelledby="contact-title">
          <div>
            <span className="eyebrow">CONTACT US</span>
            <h1 id="contact-title">有問題嗎？<br />讓我們協助你。</h1>
          </div>
          <p>不論是系學會活動、學習資源或網站內容，都歡迎留下問題。我們會將訊息交給合適的窗口處理。</p>
        </section>

        <div className="contact-layout">
          <aside className="contact-details" aria-labelledby="contact-details-title">
            <span className="eyebrow">BEFORE YOU SEND</span>
            <h2 id="contact-details-title">提交前的小提醒</h2>
            <ol>
              <li><span>01</span><p><strong>選擇問題類別</strong>幫助我們更快找到負責窗口。</p></li>
              <li><span>02</span><p><strong>提供完整資訊</strong>請說明遇到的情況與希望獲得的協助。</p></li>
              <li><span>03</span><p><strong>留意電子信箱</strong>後續回覆將寄到你填寫的 Email。</p></li>
            </ol>
            <div className="contact-email-card">
              <span>也可以直接寄信</span>
              <a href={`mailto:${contactEmail}`}>{contactEmail}<span aria-hidden="true">↗</span></a>
            </div>
          </aside>

          <section className="contact-form-card" aria-labelledby="contact-form-title">
            <div className="contact-form-heading">
              <div>
                <span className="eyebrow">QUESTION FORM</span>
                <h2 id="contact-form-title">提交問題</h2>
              </div>
              <span className="contact-required-note"><i aria-hidden="true">*</i> 為必填欄位</span>
            </div>

            <form className="contact-form" onSubmit={handleSubmit} onChange={() => status !== "idle" && setStatus("idle")}>
              <div className="contact-form-row">
                <label>
                  姓名 <span aria-hidden="true">*</span>
                  <input name="name" type="text" autoComplete="name" required maxLength={60} placeholder="請輸入姓名" />
                </label>
                <label>
                  Email <span aria-hidden="true">*</span>
                  <input name="email" type="email" autoComplete="email" required maxLength={120} placeholder="name@example.com" />
                </label>
              </div>

              <label>
                問題類別 <span aria-hidden="true">*</span>
                <select name="category" required defaultValue="">
                  <option value="" disabled>請選擇問題類別</option>
                  <option value="association">系學會相關</option>
                  <option value="activities">系上活動</option>
                  <option value="teams">系隊相關</option>
                  <option value="resources">學習資料</option>
                  <option value="website">網站問題或建議</option>
                  <option value="other">其他</option>
                </select>
              </label>

              <label>
                主旨 <span aria-hidden="true">*</span>
                <input name="subject" type="text" required maxLength={120} placeholder="請簡短描述你的問題" />
              </label>

              <label>
                問題內容 <span aria-hidden="true">*</span>
                <textarea name="message" required minLength={10} maxLength={2000} rows={7} placeholder="請提供相關背景與具體問題（至少 10 個字）" />
              </label>

              <label className="contact-honeypot" aria-hidden="true">
                Website
                <input name="website" type="text" tabIndex={-1} autoComplete="off" />
              </label>

              <div className="contact-form-footer">
                <p>請勿在表單中填寫密碼、身分證字號或其他敏感個人資料。</p>
                <button type="submit" disabled={status === "submitting"}>
                  {status === "submitting" ? "傳送中…" : "送出問題"}
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              {status === "success" && <p className="contact-form-status is-success" role="status">問題已成功送出，感謝你的來信。</p>}
              {status === "error" && <p className="contact-form-status is-error" role="alert">目前無法送出，請稍後再試，或直接寄信至 <a href={`mailto:${contactEmail}`}>{contactEmail}</a>。</p>}
              {status === "unavailable" && <p className="contact-form-status is-error" role="alert">線上收件服務尚未啟用，請先直接寄信至 <a href={`mailto:${contactEmail}`}>{contactEmail}</a>。</p>}
            </form>
          </section>
        </div>
      </PageContainer>
    </main>
  );
}
