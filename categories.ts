export const categories = ["Furniture", "Electronics", "Food", "Clothing", "Household"] as const;
export type Category = (typeof categories)[number];

export const subcategories: Record<Category, string[]> = {
  Furniture: ["Living room", "Bedroom", "Kitchen & dining", "Office"],
  Electronics: ["Computers", "Phones", "TV & audio", "Home appliances"],
  Food: ["Food items", "Cooked food"],
  Clothing: ["Men", "Women", "Children"],
  Household: ["Kitchen utensils", "Cleaning supplies", "Home décor", "Storage & organization", "Bedding & linens"],
};
