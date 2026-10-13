import React from "react";
import EesaImage from "./components/EesaImage";
import { DepartmentLayout } from "./components/DepartmentLayout";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./Department.module.css";
import departments from "./data/eesa";

export default function DepartmentPage() {
    const navigate = useNavigate();
    const { slug } = useParams();
    const data = departments[slug ?? ""];

    if (!data) {
        return <div style={{ padding: 40 }}>找不到此部門：{slug}</div>;
    }

    return (
        <DepartmentLayout department={data} slug={slug ?? ""} active="intro" styles={styles}>

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

        </DepartmentLayout>
    );
}
