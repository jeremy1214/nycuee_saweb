import rawCategories from "../../../content/resources/categories.json";
import { createResourceRepository } from "./resourceContent";

const modules = import.meta.glob("../../../content/resources/pages/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

export const { resourceOrder, resourceCategories, defaultResourceSlug } = createResourceRepository(rawCategories, modules);
