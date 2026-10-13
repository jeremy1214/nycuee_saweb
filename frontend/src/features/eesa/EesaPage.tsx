import { Container } from "./components/Grid";
import { AssociationIntroduction, AssociationContact, DepartmentCards, PresidentMessage } from "./components/EesaSections";
import { eesaOverview } from "./data/eesa";
import styles from "./EesaIntro.module.css";

export default function EesaPage() {
  return <div className={styles.eesaIntroPage}>
    <div className={styles.titleBanner}><img src={eesaOverview.bannerImage} alt={eesaOverview.bannerAlt} className={styles.titleImage} /></div>
    <Container className={styles.mainContent}>
      <AssociationIntroduction />
      <DepartmentCards />
      <PresidentMessage />
      <AssociationContact />
    </Container>
  </div>;
}
