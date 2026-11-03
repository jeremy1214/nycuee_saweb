import React from "react";
import { DepartmentLayout } from "./components/DepartmentLayout";

import styles from "./Department.module.css";
import { useEesaContent, OrganizationContentStatus, useOrganizationParams, useOrganizationNavigate } from "../organization/OrganizationContentProvider";

export default function DepartmentSkillsPage() {
    const navigate = useOrganizationNavigate();
    const { slug } = useOrganizationParams();
    const { departments, status } = useEesaContent();
    const data = departments[slug ?? ""];

    if (status !== 'ready') return <OrganizationContentStatus kind="eesa" />;

    if (!data) {
        return <div style={{ padding: 40 }}>找不到此部門：{slug}</div>;
    }

    if (!data.skills) return <p>找不到此部門的學習能力內容。</p>;
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
