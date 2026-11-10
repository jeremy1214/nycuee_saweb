import { useOrganizationNavigate } from "../../organization/OrganizationContentProvider";
import { useSiteSettings } from "../../../shared/data/SiteContentProvider";
import { useEesaContent } from "../../organization/OrganizationContentProvider";
import EesaImage from "./EesaImage";
import styles from "../EesaIntro.module.css";

export function DepartmentCards() {
  const navigate = useOrganizationNavigate();
  const { departmentCards: departments } = useEesaContent();
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
                                        <EesaImage
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
  const { eesaOverview } = useEesaContent();
  if (!eesaOverview) return null;
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
  const { eesaOverview } = useEesaContent();
  if (!eesaOverview) return null;
  return <div className={styles.section}>
    <div className={styles.divider} />
    <h2 className={styles.sectionTitle}>{eesaOverview.presidentTitle}</h2>
    <p className={styles.sectionText}>{eesaOverview.presidentMessage}</p>
  </div>;
}

export function AssociationContact() {
  const { siteContact, socialLinks } = useSiteSettings();
  const facebook = socialLinks.find((social) => social.id === "facebook");
  const instagram = socialLinks.find((social) => social.id === "instagram");
  return <div className={styles.section}>
    <h2 className={styles.sectionTitle}>聯絡資訊</h2>
    <ul className={styles.contactList}>
      <li>電子信箱：{siteContact.email}</li>
      {facebook && <li>Facebook：{facebook.displayName}</li>}
      {instagram && <li>Instagram：{instagram.displayName}</li>}
      <li>辦公室：{siteContact.office}</li>
    </ul>
  </div>;
}
