import React from "react";
import { DepartmentLayout } from "./components/DepartmentLayout";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./Department.module.css";
import departments from "./data/eesa";

export default function DepartmentSkillsPage() {
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
        <DepartmentLayout department={data} slug={slug ?? ""} active="skills" styles={styles}>

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

        </DepartmentLayout>
    );
}
