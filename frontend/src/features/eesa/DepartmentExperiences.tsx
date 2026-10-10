import React from "react";
import EesaImage from "./EesaImage";
import { Container, Row, Col } from "./Layout";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./Department.module.css";
import departments from "./data";

export default function DepartmentExperiences() {
    const navigate = useNavigate();
    const { slug, expId } = useParams();
    const data = departments[slug ?? ""];

    if (!data || !data.experiences) {
        return <div style={{ padding: 40 }}>找不到此部門的體驗談：{slug}</div>;
    }

    const experiences = data.experiences;
    const currentIdx = experiences.findIndex(e => e.id === expId);
    
    if (currentIdx === -1) {
        return <div style={{ padding: 40 }}>找不到此則體驗談：{expId}</div>;
    }

    const experience = experiences[currentIdx];
    const prev = currentIdx > 0 ? experiences[currentIdx - 1] : null;
    const next = currentIdx < experiences.length - 1 ? experiences[currentIdx + 1] : null;

    const renderNavButtons = () => (
        <div className={styles.expNav}>
            {prev && (
                <span 
                    className={styles.expNavBtn} 
                    onClick={() => navigate(`/eesa/${slug}/experiences/${prev.id}`)}
                >
                    上一則
                </span>
            )}
            {next && (
                <span 
                    className={styles.expNavBtn} 
                    onClick={() => navigate(`/eesa/${slug}/experiences/${next.id}`)}
                    style={{ marginLeft: '40px' }}
                >
                    下一則
                </span>
            )}
        </div>
    );

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
                                首頁
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
                                    className={`${styles.sidebarLabel} ${item.label === "體驗談" ? styles.active : ""}`}
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
                        <div className={styles.expHeader}>
                            <h2 className={styles.expTitle}>{experience.title}</h2>
                            {renderNavButtons()}
                        </div>

                        <div className={styles.divider}></div>

                        <div className={styles.expContentBody}>
                            <div className={styles.expImagesSide}>
                                {experience.images.map((img, idx) => (
                                    <div key={idx} className={styles.expImageWrapper}>
                                        <EesaImage
                                            src={img}
                                            alt={`${experience.title} 圖片 ${idx + 1}`}
                                            className={styles.expImage}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className={styles.expTextSide}>
                                {experience.content.map((p, idx) => (
                                    <p key={idx} className={styles.contentText}>
                                        {p}
                                    </p>
                                ))}
                            </div>
                        </div>

                        <div className={styles.expFooter}>
                            {renderNavButtons()}
                        </div>

                        <div className={styles.divider} style={{ marginTop: '60px' }}></div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}
