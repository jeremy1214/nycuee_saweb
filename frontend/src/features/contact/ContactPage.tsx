import { sitePath } from "../../shared/sitePath";
import { useRef, useState, type ClipboardEvent, type FormEvent } from "react";
import { Breadcrumb, PageContainer } from "../../shared/components/index";
import { useSiteSettings } from "../../shared/data/SiteContentProvider";
import "./contact.css";

const maxImageBytes = 10 * 1024 * 1024;
type SubmissionStatus = "idle" | "submitting" | "success" | "error" | "limited";

export default function ContactPage() {
  const contactEmail = useSiteSettings().siteContact.email;
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [inputError, setInputError] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const submitting = useRef(false);
  const endpoint = import.meta.env.VITE_CONTACT_FORM_ENDPOINT?.trim() || sitePath("/api/v1/public/contact-messages");

  function chooseAttachment(file: File) {
    setStatus("idle");
    const supportedType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    const supportedExtension = /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!supportedType && !supportedExtension) {
      setAttachment(null);
      setAttachmentError("請選擇 JPEG、PNG 或 WebP 圖片。");
      return;
    }
    if (!file.size || file.size > maxImageBytes) {
      setAttachment(null);
      setAttachmentError("請選擇 10 MiB 以內且非空白的圖片。");
      return;
    }
    setAttachment(file);
    setAttachmentError("");
  }

  function pasteAttachment(event: ClipboardEvent<HTMLFormElement>) {
    if (submitting.current) return;
    const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith("image/"));
    if (!image) return;
    event.preventDefault();
    chooseAttachment(image);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting.current || attachmentError) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    setInputError("");
    if (attachment) formData.set("image", attachment, attachment.name || "attachment");
    formData.set("source", "nycu-ee-website");
    formData.set("submittedAt", new Date().toISOString());

    submitting.current = true;
    setStatus("submitting");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: attachment ? { Accept: "application/json" } : {
          Accept: "application/json", "Content-Type": "application/json",
        },
        body: attachment ? formData : JSON.stringify(Object.fromEntries(formData)),
      });

      if (response.status === 429) {
        setStatus("limited");
        return;
      }
      if (response.status === 400 || response.status === 413) {
        const body = await response.json().catch(() => null);
        setInputError(response.status === 413 ? "送出的資料超出單次傳送容量。"
          : typeof body?.message === "string" ? body.message : "請檢查欄位內容和圖片格式。");
        setStatus("error");
        return;
      }
      if (!response.ok) throw new Error(`Contact form returned ${response.status}`);

      form.reset();
      setAttachment(null);
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      submitting.current = false;
    }
  }

  return (
    <main className="contact-page">
      <PageContainer>
        <Breadcrumb items={[{ label: "首頁", to: "/" }, { label: "聯絡我們" }]} />

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
              <li><span>03</span><p><strong>視需要附上圖片</strong>截圖或照片能協助我們了解問題。</p></li>
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

            <form className="contact-form" onSubmit={handleSubmit} onPaste={pasteAttachment} onChange={() => !submitting.current && status !== "idle" && setStatus("idle")}>
              <fieldset disabled={status === "submitting"} className="contact-form-fields">
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
                <input name="subject" type="text" required placeholder="請簡短描述你的問題" />
              </label>

              <label>
                問題內容 <span aria-hidden="true">*</span>
                <textarea name="message" required rows={7} placeholder="請提供相關背景與具體問題" />
              </label>

              <div className="contact-attachment">
                <span className="contact-attachment-label">圖片附件（選填）</span>
                <label className="contact-attachment-picker">
                  選擇圖片
                  <input type="file" aria-describedby="contact-image-help" onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) chooseAttachment(file);
                    event.currentTarget.value = "";
                  }} />
                </label>
                <small id="contact-image-help">也可以直接貼上截圖。支援 JPEG、PNG、WebP，大小上限 10 MiB。</small>
                {attachment && <p role="status">已選擇 {attachment.name || "剪貼簿圖片"}</p>}
                {attachmentError && <p className="contact-form-status is-error" role="alert">{attachmentError}</p>}
                {(attachment || attachmentError) && <button type="button" onClick={() => {
                  setAttachment(null);
                  setAttachmentError("");
                  setStatus("idle");
                }}>移除附件</button>}
              </div>

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
              {status === "error" && <p className="contact-form-status is-error" role="alert">{inputError || <>目前無法送出，請稍後再試，或直接寄信至 <a href={`mailto:${contactEmail}`}>{contactEmail}</a>。</>}</p>}
              {status === "limited" && <p className="contact-form-status is-error" role="alert">傳送次數過多，請稍後再試。你填寫的內容已保留。</p>}
              </fieldset>
            </form>
          </section>
        </div>
      </PageContainer>
    </main>
  );
}
