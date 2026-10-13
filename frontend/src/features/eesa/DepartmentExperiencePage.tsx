import React from "react";
import EesaImage from "./components/EesaImage";
import { DepartmentLayout } from "./components/DepartmentLayout";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./Department.module.css";
import departments from "./data/eesa";

export default function DepartmentExperiencePage() {
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
        <DepartmentLayout department={data} slug={slug ?? ""} active="experiences" styles={styles} returnLabel="首頁">

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

        </DepartmentLayout>
    );
}
