import React from "react";
import { departmentCards as departments } from "./data";
import { Container } from "./Layout";
import { useNavigate } from "react-router-dom";
import styles from "./EesaIntro.module.css";

export default function EesaIntro() {
    const navigate = useNavigate();

    return (
        <div className={styles.eesaIntroPage}>
            {/* ================= EESA Title Banner ================= */}
            <div className={styles.titleBanner}>
                <img
                    // 這裡的橫幅圖你也可以選擇從後端抓，或者維持原樣放在前端 public
                    src="/eesa.jpg" 
                    alt="EESA 系學會介紹"
                    className={styles.titleImage}
                />
            </div>

            <Container className={styles.mainContent}>
                {/* ================= EESA Introduction Section ================= */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>EESA（電機工程學系學會）</h2>
                    <div className={styles.divider}></div>
                    <p className={styles.sectionText}>
                        致力於服務系上同學，舉辦各項活動並促進師生交流。學會組織包含會長與四大部門，分工合作推動各項事務。
                    </p>
                </div>

                {/* ================= Departments Section ================= */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>四大部門</h2>
                    <p className={styles.sectionText}>
                        學會下設四大部門，分工合作推動各項事務。點擊圖片以查看各部門詳細內容。
                    </p>
                </div>

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
                                        <img
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

                {/* ================= President Section ================= */}
                <div className={styles.section}>
                    <div className={styles.divider}></div>
                    <h2 className={styles.sectionTitle}>會長的話</h2>
                    <p className={styles.sectionText}>會長的話</p>
                </div>

                {/* ================= Contact Information Section ================= */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>聯絡資訊</h2>
                    <ul className={styles.contactList}>
                        <li>電子信箱：eesa@nycu.edu.tw</li>
                        <li>Facebook：NYCU電機系學會</li>
                        <li>Instagram：@nycu_eesa</li>
                        <li>辦公室：工程五館 222 室</li>
                    </ul>
                </div>
            </Container>
        </div>
    );
}