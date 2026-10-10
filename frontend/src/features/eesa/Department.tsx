import React from "react";
import EesaImage from "./EesaImage";
import { Container, Row, Col } from "./Layout";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./Department.module.css";
import departments from "./data";

export default function Department() {
    const navigate = useNavigate();
    const { slug } = useParams();
    const data = departments[slug ?? ""];

    if (!data) {
        return <div style={{ padding: 40 }}>找不到此部門：{slug}</div>;
    }

    return (
        <div className={styles.departmentPage}>
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
                            <div className={`${styles.sidebarLabel} ${styles.active}`}>
                                部門介紹
                            </div>
                            <div
                                className={styles.sidebarLabel}
                                onClick={() => navigate(`/eesa/${slug}/activities`)}
                                style={{ cursor: "pointer" }}
                            >
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
                        {/* 簡介 */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>{data.title}簡介</h2>
                            <div className={styles.sectionContent}>
                                {data.introParagraphs.map((p, idx) => (
                                    <p key={idx} className={styles.contentText}>
                                        {p}
                                    </p>
                                ))}
                            </div>
                        </section>

                        {/* 合照 */}
                        <div className={styles.divider}></div>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>{data.title} 合照</h2>
                            <div className={styles.photoSection}>
                                <div className={styles.photoPlaceholder}>
                                    <EesaImage
                                        src={data.groupPhotoImage}
                                        alt={`${data.title}合照`}
                                        className={styles.groupPhoto}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* 部員名單 */}
                        <div className={styles.divider}></div>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>部員名單</h2>
                            <div className={styles.sectionContent}>
                                <p className={styles.contentText}>
                                    {data.memberDescription || "原專案尚未提供部員名單。"}
                                </p>
                            </div>
                        </section>

                        <div className={styles.divider}></div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}
