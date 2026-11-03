import EesaImage from "./components/EesaImage";
import React from "react";
import { DepartmentLayout } from "./components/DepartmentLayout";

import styles from "./Activities.module.css";
import { useEesaContent, OrganizationContentStatus, useOrganizationParams, useOrganizationNavigate } from "../organization/OrganizationContentProvider";

export default function DepartmentActivitiesPage() {
    const navigate = useOrganizationNavigate();
    const { slug } = useOrganizationParams();
    const { departments, status } = useEesaContent();
    const data = departments[slug ?? ""];

    if (status !== 'ready') return <OrganizationContentStatus kind="eesa" />;

    if (!data) {
        return <div style={{ padding: 40 }}>找不到此部門：{slug}</div>;
    }

    const activities = data.activities || [];

    return (
        <DepartmentLayout department={data} slug={slug ?? ""} active="activities" styles={styles}>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>{data.title} 活動介紹＆工作成果</h2>
                            <p className={styles.sectionDescription}>
                                點擊活動名稱以了解更多關於該項活動的資訊
                            </p>
                            <div className={styles.divider}></div>
                        </section>

                        {activities.length === 0 && <p className={styles.sectionDescription}>原專案尚未提供此部門的活動詳細資料。</p>}
                        <div className={styles.activitiesGrid}>
                            {activities.map((activity) => (
                                <div
                                    key={activity.slug}
                                    className={styles.activityCard}
                                    onClick={() => navigate(`/eesa/${slug}/activities/${activity.slug}`)}
                                    style={{ cursor: "pointer" }}
                                >
                                    <h3 className={styles.activityCardTitle}>{activity.name}</h3>
                                    <div className={styles.imageWrapper}>
                                        <EesaImage
                                            src={activity.image}
                                            alt={activity.name}
                                            className={styles.activityCardImage}
                                        />
                                    </div>
                                    <div className={styles.cardDivider}></div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.bottomDivider}></div>

        </DepartmentLayout>
    );
}
