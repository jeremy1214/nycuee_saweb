import { resourceOrder } from "./resourceRepository";
import type { ResourceSlug } from "../resourceTypes";

export { resourceOrder, resourceCategories, defaultResourceSlug } from "./resourceRepository";

export function isResourceSlug(value: string | undefined): value is ResourceSlug {
  return typeof value === "string" && resourceOrder.includes(value);
}
