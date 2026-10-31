import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import type {
  ActivityDetailImage,
  ActivityDetailSection,
  ActivityDetailTab,
} from "../../../../shared/activity-content";
import type { MediaScope } from "./cmsApi";
import { Field } from "./cmsUi";
import { MediaBrowser } from "./MediaManager";
import { Modal } from "../../shared/components/ui/Modal";
import { mediaPreview } from "./mediaPreview";
export function ListEditor<T>({
  label,
  items,
  onChange,
  create,
  render,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, change: (value: T) => void, index: number) => ReactNode;
}) {
  function move(index: number, offset: number) {
    const next = [...items];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  }
  return (
    <section className="cms-list-editor">
      <h3>{label}</h3>
      {items.map((item, index) => (
        <div className="cms-nested" key={index}>
          <div className="cms-toolbar">
            <strong>
              {label} {index + 1}
            </strong>
            <div className="cms-toolbar">
              <button
                type="button"
                aria-label={`${label} ${index + 1} 上移`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`${label} ${index + 1} 下移`}
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                移除{label} {index + 1}
              </button>
            </div>
          </div>
          {render(
            item,
            (value) =>
              onChange(items.map((old, i) => (i === index ? value : old))),
            index,
          )}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, create()])}>
        新增{label}
      </button>
    </section>
  );
}
export function Paragraphs({
  value,
  onChange,
  path,
}: {
  path?: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <ListEditor
      label="段落"
      items={value}
      onChange={onChange}
      create={() => ""}
      render={(text, change, i) => (
        <Field
          label={`段落 ${i + 1} 文字`}
          path={path ? `${path}.${i}` : undefined}
        >
          <textarea
            value={text}
            onChange={(e) => change(e.target.value)}
            rows={4}
          />
        </Field>
      )}
    />
  );
}
export const newImage = (): ActivityDetailImage => ({
  src: "",
  alt: "",
  fit: "cover",
  objectPosition: "center",
});
export function ImageField({
  value,
  onChange,
  scope,
  label = "圖片",
  path,
}: {
  path?: string;
  value: ActivityDetailImage;
  onChange: (value: ActivityDetailImage) => void;
  scope: MediaScope;
  label?: string;
}) {
  const [choosing, setChoosing] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!choosing && wasOpen.current) opener.current?.focus();
    wasOpen.current = choosing;
  }, [choosing]);
  return (
    <div className="cms-image-field">
      <h4>{label}</h4>
      {value.src && <img src={mediaPreview(value.src)} alt={value.alt} />}
      <div className="cms-form-grid">
        <Field label={`${label}路徑`} path={path ? `${path}.src` : undefined}>
          <input
            value={value.src}
            placeholder="/activities/..."
            onChange={(e) => onChange({ ...value, src: e.target.value })}
          />
        </Field>
        <Field
          label={`${label}替代文字`}
          path={path ? `${path}.alt` : undefined}
        >
          <input
            value={value.alt}
            onChange={(e) => onChange({ ...value, alt: e.target.value })}
          />
        </Field>
        <Field label="顯示方式">
          <select
            value={value.fit ?? "cover"}
            onChange={(e) =>
              onChange({ ...value, fit: e.target.value as "cover" | "contain" })
            }
          >
            <option value="cover">填滿</option>
            <option value="contain">完整顯示</option>
          </select>
        </Field>
        <Field label="圖片位置">
          <input
            value={value.objectPosition ?? "center"}
            placeholder="center 或 50% 30%"
            onChange={(e) =>
              onChange({
                ...value,
                objectPosition: e.target.value || undefined,
              })
            }
          />
        </Field>
      </div>
      <button ref={opener} type="button" onClick={() => setChoosing(true)}>
        從媒體庫選取{label}
      </button>
      {choosing && (
        <Modal open title="選擇圖片" onClose={() => setChoosing(false)}>
          <MediaBrowser
            scope={scope}
            onSelect={(src, alt) => {
              onChange({ ...value, src, alt });
              setChoosing(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
export const newSection = (): ActivityDetailSection => ({
  id: `section-${crypto.randomUUID().slice(0, 8)}`,
  navLabel: "",
  eyebrow: "",
  title: "",
  paragraphs: [""],
});
export function Sections({
  items,
  onChange,
  scope,
  path = "content.detail.sections",
}: {
  path?: string;
  items: ActivityDetailSection[];
  onChange: (value: ActivityDetailSection[]) => void;
  scope: MediaScope;
}) {
  return (
    <ListEditor
      label="章節"
      items={items}
      onChange={onChange}
      create={newSection}
      render={(s, change, index) => (
        <>
          <div className="cms-form-grid">
            {(["id", "navLabel", "eyebrow", "title"] as const).map(
              (name, i) => (
                <Field
                  key={name}
                  path={`${path}.${index}.${name}`}
                  label={["章節識別值", "導覽文字", "英文小標", "章節標題"][i]}
                >
                  <input
                    value={s[name]}
                    onChange={(e) => change({ ...s, [name]: e.target.value })}
                  />
                </Field>
              ),
            )}
          </div>
          <Paragraphs
            value={s.paragraphs}
            path={`${path}.${index}.paragraphs`}
            onChange={(paragraphs) => change({ ...s, paragraphs })}
          />
          <label className="cms-check">
            <input
              type="checkbox"
              checked={!!s.image}
              onChange={(e) =>
                change({
                  ...s,
                  image: e.target.checked ? newImage() : undefined,
                })
              }
            />
            此章節包含圖片
          </label>
          {s.image && (
            <ImageField
              value={s.image}
              path={`${path}.${index}.image`}
              onChange={(image) => change({ ...s, image })}
              scope={scope}
            />
          )}
        </>
      )}
    />
  );
}
export function Tabs({
  items,
  onChange,
  scope,
}: {
  items: ActivityDetailTab[];
  onChange: (value: ActivityDetailTab[]) => void;
  scope: MediaScope;
}) {
  return (
    <ListEditor
      label="分頁"
      items={items}
      onChange={onChange}
      create={() => ({
        id: `tab-${crypto.randomUUID().slice(0, 8)}`,
        navLabel: "",
        sections: [newSection()],
      })}
      render={(tab, change, index) => (
        <>
          <div className="cms-form-grid">
            <Field label="分頁識別值" path={`content.detail.tabs.${index}.id`}>
              <input
                value={tab.id}
                onChange={(e) => change({ ...tab, id: e.target.value })}
              />
            </Field>
            <Field
              label="分頁名稱"
              path={`content.detail.tabs.${index}.navLabel`}
            >
              <input
                value={tab.navLabel}
                onChange={(e) => change({ ...tab, navLabel: e.target.value })}
              />
            </Field>
          </div>
          <Sections
            items={tab.sections}
            path={`content.detail.tabs.${index}.sections`}
            onChange={(sections) => change({ ...tab, sections })}
            scope={scope}
          />
        </>
      )}
    />
  );
}
