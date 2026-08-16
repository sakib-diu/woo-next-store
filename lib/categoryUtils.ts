import { CategorieType } from "../types/data-type";
import { decodeEntities, slugifyKey } from "./utils";

export interface MenuSubItem {
    id: number;
    name: string;
    categoryKey: string; // matches the `category` group key used by app/shop/page.tsx and ShopBreadCrumb.tsx
}

export interface MenuItem {
    id: number;
    name: string;
    slug: string; // top-level audience slug, used as `?audience=`
    subMenu?: MenuSubItem[];
}

/**
 * Builds the categories mega menu from the catalog's real (two-level) taxonomy:
 * top-level (parent === 0) categories are the audience split (Men/Women/Kids/
 * Unisex/Baby & Toddler); each one's direct children are its product-type
 * subcategories (T-Shirts, Shoes, ...). `categoryKey` is computed the same way
 * app/shop/page.tsx and ShopBreadCrumb.tsx resolve the `category` query param
 * (slugifyKey(cat.name) over the raw, HTML-entity-encoded name), so mega-menu
 * links land on the matching shop filter.
 */
export function generateMenuItems(categories: CategorieType[]): MenuItem[] {
    if (!Array.isArray(categories) || categories.length === 0) {
        return [];
    }

    const audienceCategories = categories
        .filter((cat) => cat.parent === 0 && cat.count > 0)
        .sort((a, b) => b.count - a.count);

    return audienceCategories.map((audience) => {
        const subMenu: MenuSubItem[] = categories
            .filter((cat) => cat.parent === audience.id && cat.count > 0)
            .sort((a, b) => b.count - a.count)
            .map((cat) => ({
                id: cat.id,
                name: decodeEntities(cat.name),
                categoryKey: slugifyKey(cat.name),
            }));

        return {
            id: audience.id,
            name: decodeEntities(audience.name),
            slug: audience.slug,
            ...(subMenu.length > 0 ? { subMenu } : {}),
        };
    });
}
