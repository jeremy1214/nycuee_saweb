import { useState, type ImgHTMLAttributes } from 'react';
import { imageSrc, imageAlt, type ImageValue } from '../../../../../shared/organization-content';
import styles from './Grid.module.css';
export default function EesaImage({ src: value, alt: fallback, ...props }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: ImageValue | null }) {
  const src = imageSrc(value); const alt = imageAlt(value, fallback);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || src === failedSource || src.includes('placeholder')) return <div className={styles.missingImage} role="img" aria-label={`${alt ?? '圖片'}預留區`}>{alt ?? '圖片'}（原專案尚未提供圖片）</div>;
  return <img {...props} src={src} alt={alt} onError={event => { setFailedSource(src); props.onError?.(event); }} />;
}
