import React, { useState, useEffect } from "react";
import { DepartmentLayout } from "./components/DepartmentLayout";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./Activities.module.css";
import departments from "./data/eesa";

export default function DepartmentActivityPage() {
    const navigate = useNavigate();
    const { slug, activitySlug } = useParams();
    const data = departments[slug ?? ""];
    
    // 輪播索引狀態
    const [currentImgIdx, setCurrentImgIdx] = useState(0);
    useEffect(() => setCurrentImgIdx(0), [slug, activitySlug]);

    if (!data) {
        return <div style={{ padding: 40 }}>找不到此部門：{slug}</div>;
    }

    const activities = data.activities || [];
    const idx = activities.findIndex((a) => a.slug === activitySlug);

    if (idx === -1) {
        return <div style={{ padding: 40 }}>找不到此活動：{activitySlug}</div>;
    }

    const activity = activities[idx];
    const prev = idx > 0 ? activities[idx - 1] : null;
    const next = idx < activities.length - 1 ? activities[idx + 1] : null;

    // 判斷是否需要輪播功能 (活動攝影 或 宣傳貼文)
    const isCarousel = slug === "publicity" && (activitySlug === "photography" || activitySlug === "social-posts");
    const detailImages = activity.detailImages || (activity.image ? [activity.image] : []);

    const handleNextImg = () => {
        setCurrentImgIdx((prevIdx) => (prevIdx + 1) % detailImages.length);
    };

    const handlePrevImg = () => {
        setCurrentImgIdx((prevIdx) => (prevIdx - 1 + detailImages.length) % detailImages.length);
    };

    return (
        <DepartmentLayout department={data} slug={slug ?? ""} active="activities" styles={styles} returnLabel="首頁" showExtras={false}>

                        <section className={styles.activityDetail}>
                            <h2 className={styles.activityTitle}>{activity.name}</h2>

                            <div className={styles.contentRow}>
                                <div className={styles.imageContainer}>
                                    {isCarousel ? (
                                        <div className={styles.carouselWrapper}>
                                            <img
                                                src={detailImages[currentImgIdx]}
                                                alt={`${activity.name}-${currentImgIdx}`}
                                                className={styles.activityImageCarousel}
                                                onError={(e) => console.error("Image load error:", detailImages[currentImgIdx])}
                                            />
                                            {detailImages.length > 1 && (
                                                <>
                                                    <button className={styles.prevArrow} onClick={handlePrevImg} aria-label="上一張圖片">
                                                        <img src="/intro/activities/arrow_left.png" alt="Previous" className={styles.arrowImg} />
                                                    </button>
                                                    <button className={styles.nextArrow} onClick={handleNextImg} aria-label="下一張圖片">
                                                        <img src="/intro/activities/arrow_right.png" alt="Next" className={styles.arrowImg} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        activity.detailImages && activity.detailImages.length > 0 ? (
                                            activity.detailImages.map((img, idx) => (
                                                <img
                                                    key={idx}
                                                    src={img}
                                                    alt={`${activity.name}-${idx}`}
                                                    className={styles.activityImage}
                                                    style={idx > 0 ? { marginTop: '20px' } : {}}
                                                    onError={(e) => console.error("Image load error:", img)}
                                                />
                                            ))
                                        ) : (
                                            <img
                                                src={activity.image}
                                                alt={activity.name}
                                                className={styles.activityImage}
                                                onError={(e) => console.error("Image load error:", activity.image)}
                                            />
                                        )
                                    )}
                                </div>
                                <div className={styles.descriptionContainer}>
                                    {activity.description.map((p, i) => (
                                        <p key={i} className={styles.description}>
                                            {p}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <div className={styles.bottomDivider}></div>

                        {/* Navigation Buttons */}
                        <div className={styles.navButtons}>
                            {prev && (
                                <div
                                    className={styles.navButton}
                                    onClick={() => navigate(`/eesa/${slug}/activities/${prev.slug}`)}
                                >
                                    上一則
                                </div>
                            )}
                            {next && (
                                <div
                                    className={`${styles.navButton} ${styles.navButtonsRight}`}
                                    onClick={() => navigate(`/eesa/${slug}/activities/${next.slug}`)}
                                >
                                    下一則
                                </div>
                            )}
                        </div>

        </DepartmentLayout>
    );
}
