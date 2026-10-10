import React from "react";
import { Container, Row, Col } from "./Layout";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./Activities.module.css";
import departments from "./data";

export default function DepartmentActivities() {
    const navigate = useNavigate();
    const { slug } = useParams();
    const data = departments[slug ?? ""];

    if (!data) {
        return <div style={{ padding: 40 }}>找不到此部門：{slug}</div>;
    }

    const activities = data.activities || [];

    return (
        <div className={styles.page}>
            {/* Banner */}
            <div className={styles.banner}>
                <img
                    src={data.bannerImage}
                    alt={`${data.title} Banner`}
                    className={styles.bannerImage}
                />
            </div>

            <Container fluid className={styles.contentContainer}>
                <Row>
                    {/* Left Sidebar Navigation */}
                    <Col md={2} className={styles.sidebarCol}>
                        <div className={styles.sidebar}>
                            <div className={styles.sidebarIcon}>
                                <img src="/intro/all_inbox.svg" alt="inbox icon" />
                            </div>
                            <div
                                className={styles.sidebarLabel}
                                onClick={() => navigate("/eesa")}
                                style={{ cursor: "pointer" }}
                            >
                                回上一頁
                            </div>
                            <div
                                className={styles.sidebarLabel}
                                onClick={() => navigate(`/eesa/${slug}`)}
                                style={{ cursor: "pointer" }}
                            >
                                部門介紹
                            </div>
                            <div className={`${styles.sidebarLabel} ${styles.active}`}>
                                部門活動
                            </div>
                            {(data.extraSidebarItems || []).map((item, idx) => (
                                <div
                                    key={idx}
                                    className={styles.sidebarLabel}
                                    onClick={item.to ? () => { if (item.to) navigate(item.to); } : undefined}
                                    style={item.to ? { cursor: "pointer" } : undefined}
                                >
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    </Col>

                    {/* Main Content */}
                    <Col md={10} className={styles.mainCol}>
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
                                        <img
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
                    </Col>
                </Row>
            </Container>
        </div>
    );
}
