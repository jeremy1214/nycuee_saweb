import { useState, type ImgHTMLAttributes } from "react";
import styles from "./Layout.module.css";

export default function EesaImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!props.src || props.src === failedSource || props.src.includes("placeholder")) {
    return <div className={styles.missingImage} role="img" aria-label={`${props.alt ?? "圖片"}預留區`}>{props.alt ?? "圖片"}（原專案尚未提供圖片）</div>;
  }
  return <img {...props} onError={(event) => {
    setFailedSource(props.src ?? null);
    props.onError?.(event);
  }} />;
}
