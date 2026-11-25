import { Link } from "react-router-dom";
import { useCms } from "./cmsUi";

export function AdminHelp() {
  const { user } = useCms();

  return (
    <section className="cms-help" aria-labelledby="cms-help-title">
      <h1 id="cms-help-title">新手指南（Help）</h1>
      <p className="admin-description">
        第一次使用後台？跟著這三個步驟更新一筆活動內容。
      </p>

      <ol className="cms-help-steps">
        <li className="cms-panel">
          <h2>找到要更新的活動</h2>
          <p>
            在「工作總覽」的「可編輯草稿」找到標示為「活動」的項目，點選活動名稱開啟編輯頁。
            如果顯示「目前沒有待辦」，可以到「活動管理」查看可維護的活動。
            若找不到負責的項目，請管理員確認授權。
          </p>
          <div className="cms-toolbar">
            <Link className="admin-action-link" to="/admin">前往工作總覽</Link>
            <Link className="admin-action-link" to="/admin/activities">前往活動管理</Link>
          </div>
        </li>
        <li className="cms-panel">
          <h2>預覽並儲存草稿</h2>
          <p>
            在「介紹與主圖」修改一段介紹文字。若活動採用簡版，在「基本資料」修改「活動摘要」。
            點「預覽」確認文字，接著點「返回編輯」和「儲存草稿」。
            看到「已儲存草稿。」就代表儲存完成。公開網站仍會顯示已發布的版本。
          </p>
        </li>
        <li className="cms-panel">
          <h2>送出審核</h2>
          <p>
            確認內容後，點「儲存並送審」。若活動被退回，從「工作總覽」的「退回提醒」開啟該活動，
            查看退回原因，修改後再點一次「儲存並送審」。
          </p>
          {user.role === "ADMIN" && (
            <>
              <h3>管理員如何發布</h3>
              <p>
                從「工作總覽」的「待審項目」開啟活動，點「預覽」確認內容後，
                點「發布送審版本」並確認。最後用後台上方的「公開網站」連結前往網站，核對活動內容。
              </p>
            </>
          )}
        </li>
      </ol>
    </section>
  );
}
