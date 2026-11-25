import { Link } from "react-router-dom";
import { useCms } from "./cmsUi";

export function AdminHelp() {
  const { user } = useCms();

  return (
    <section className="cms-help" aria-labelledby="cms-help-title">
      <h1 id="cms-help-title">新手指南（Help）</h1>
      <p className="admin-description">
        第一次使用後台？跟著這三個步驟更新活動、系學會或系隊的內容。
      </p>

      <ol className="cms-help-steps">
        <li className="cms-panel">
          <h2>找到要更新的內容</h2>
          <p>
            在「工作總覽」的「可編輯草稿」點選項目名稱。如果沒有要修改的草稿，
            到下方對應的管理頁，點選活動、部門或系隊名稱開啟編輯頁。若找不到負責的項目，請管理員確認授權。
          </p>
          <div className="cms-toolbar">
            <Link className="admin-action-link" to="/admin">前往工作總覽</Link>
            <Link className="admin-action-link" to="/admin/activities">前往活動管理</Link>
            <Link className="admin-action-link" to="/admin/eesa">前往系學會管理</Link>
            <Link className="admin-action-link" to="/admin/teams">前往系隊管理</Link>
            {user.role === "ADMIN" && (
              <Link className="admin-action-link" to="/admin/eesa/overview">編輯系學會總覽</Link>
            )}
          </div>
        </li>
        <li className="cms-panel">
          <h2>預覽並儲存草稿</h2>
          <p>
            <strong>活動</strong>可在「介紹與主圖」修改介紹文字。若活動採用簡版，在「基本資料」修改「活動摘要」。
          </p>
          <p>
            <strong>系學會部門</strong>可在「介紹與圖片」修改「介紹段落」，或在「基本資料」更新部門卡片的「入口摘要」。
          </p>
          <p>
            <strong>系隊</strong>可在「練習時間」更新時段，或在「聯絡與入隊」更新聯絡資訊。
            要改隊伍介紹時，請到「介紹與圖片」修改「介紹段落」。
          </p>
          {user.role === "ADMIN" && (
            <p>
              <strong>系學會總覽</strong>可在「橫幅與簡介」修改「簡介」，或在「會長訊息」更新會長的文字。
            </p>
          )}
          <p>
            點「預覽」確認修改，再點「返回編輯」和「儲存草稿」。
            活動的儲存提示是「已儲存草稿。」，系學會與系隊的提示是「草稿已儲存。」
            公開網站仍會顯示已發布的版本。
          </p>
        </li>
        <li className="cms-panel">
          <h2>送出審核</h2>
          <p>
            活動請點「儲存並送審」。系學會與系隊請先點「儲存草稿」，等畫面出現「草稿已儲存。」再點「送審」。
            若內容被退回，從「工作總覽」的「退回提醒」開啟該項目，查看原因後修改，再依同樣的方式送審。
          </p>
          {user.role === "ADMIN" && (
            <>
              <h3>管理員如何發布</h3>
              <p>
                從「工作總覽」的「待審項目」開啟內容，點「預覽」確認後，再點「發布送審版本」並確認。
                最後用後台上方的「公開網站」連結前往對應的活動、系學會或系隊頁面，核對發布結果。
              </p>
            </>
          )}
        </li>
      </ol>
    </section>
  );
}
