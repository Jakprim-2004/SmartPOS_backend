export interface Product {
    id: number;
    name: string;
    price: number;
    cost: number;
    categoryId: number;
    category?: { id: number; name: string };
    imageUrl?: string;
    stock: number;
    barcode?: string;
    createdAt: Date;
    updatedAt: Date;
}
