import { Container } from "./components/Grid";
import { AssociationIntroduction, AssociationContact, DepartmentCards, PresidentMessage } from "./components/EesaSections";
import { useEesaContent, OrganizationContentStatus } from "../organization/OrganizationContentProvider";
import EesaImage from "./components/EesaImage";
import styles from "./EesaIntro.module.css";

export default function EesaPage() {
  const { eesaOverview, status } = useEesaContent();
  if (status !== "ready") return <OrganizationContentStatus kind="eesa" />;
  return <div className={styles.eesaIntroPage}>
    {eesaOverview && <div className={styles.titleBanner}><EesaImage src={eesaOverview.bannerImage} alt={eesaOverview.bannerAlt} className={styles.titleImage} /></div>}
    <Container className={styles.mainContent}>
      {!eesaOverview && <p>系學會總覽目前未公開。</p>}
      <AssociationIntroduction />
      <DepartmentCards />
      <PresidentMessage />
      <AssociationContact />
    </Container>
  </div>;
}
