import React from "react";
import { Container, Row, Col } from "./Layout";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./Department.module.css";
import departments from "./data";

export default function DepartmentSkills() {
    const navigate = useNavigate();
    const { slug } = useParams();
    const data = departments[slug ?? ""];

    if (!data) {
        return <div style={{ padding: 40 }}>找不到此部門：{slug}</div>;
    }

    const skillsData = data.skills || {
        mainTitle: `加入 ${data.title} 學到的能力`,
        subTitle: "下滑以了解更多",
        items: []
    };

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
                            <div
                                className={styles.sidebarLabel}
                                onClick={() => navigate(`/eesa/${slug}`)}
                                style={{ cursor: "pointer" }}
                            >
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
                                    className={`${styles.sidebarLabel} ${item.label === "學習能力" ? styles.active : ""}`}
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
                            <h2 className={styles.skillsMainTitle}>{skillsData.mainTitle}</h2>
                            <p className={styles.skillsSubTitle}>{skillsData.subTitle}</p>
                            
                            <div className={styles.divider}></div>

                            <div className={styles.skillsContent}>
                                {skillsData.items.map((skill, idx) => (
                                    <div key={idx} className={styles.skillSection}>
                                        <h3 className={styles.skillItemTitle}>{skill.title}</h3>
                                        <div className={styles.skillItemContent}>
                                            {skill.content.split('\n').map((line, lineIdx) => (
                                                <p key={lineIdx} style={{ marginBottom: lineIdx === skill.content.split('\n').length - 1 ? 0 : '10px' }}>
                                                    {line}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <div className={styles.divider}></div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}
