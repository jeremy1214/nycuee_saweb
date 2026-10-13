import { useNavigate } from "react-router-dom";
import { siteContact, socialLinks } from "../../../shared/data/site";
import { eesaOverview } from "../data/eesa";
import { departmentCards as departments } from "../data/eesa";
import styles from "../EesaIntro.module.css";

export function DepartmentCards() {
  const navigate = useNavigate();
  return (
                    <div className={styles.departmentsGrid}>
                        {departments.map((dept, idx) => (
                            <div
                                key={idx}
                                className={styles.departmentCard}
                                onClick={() => dept.link && navigate(dept.link)}
                                style={{ cursor: dept.link ? "pointer" : "default" }}
                            >
                                <div className={styles.cardInner}>
                                    <div className={styles.imageWrapper}>
                                        <img
                                            src={dept.image}
                                            alt={dept.name}
                                            className={styles.departmentImage}
                                        />
                                    </div>
                                    <h4 style={{ marginTop: '15px', fontWeight: 'bold' }}>{dept.name} ({dept.nameEn})</h4>
                                    <p className={styles.departmentDescription}>
                                        {dept.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
  );
}

export function AssociationIntroduction() {
  return <>
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{eesaOverview.title}</h2>
      <div className={styles.divider} />
      <p className={styles.sectionText}>{eesaOverview.introduction}</p>
    </div>
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{eesaOverview.departmentsTitle}</h2>
      <p className={styles.sectionText}>{eesaOverview.departmentsDescription}</p>
    </div>
  </>;
}

export function PresidentMessage() {
  return <div className={styles.section}>
    <div className={styles.divider} />
    <h2 className={styles.sectionTitle}>{eesaOverview.presidentTitle}</h2>
    <p className={styles.sectionText}>{eesaOverview.presidentMessage}</p>
  </div>;
}

export function AssociationContact() {
  const facebook = socialLinks.find((social) => social.id === "facebook")!;
  const instagram = socialLinks.find((social) => social.id === "instagram")!;
  return <div className={styles.section}>
    <h2 className={styles.sectionTitle}>聯絡資訊</h2>
    <ul className={styles.contactList}>
      <li>電子信箱：{siteContact.email}</li>
      <li>Facebook：{facebook.displayName}</li>
      <li>Instagram：{instagram.displayName}</li>
      <li>辦公室：{siteContact.office}</li>
    </ul>
  </div>;
}
