export interface Customer {
    id: number;
    name: string;
    phone: string;
    email?: string;
    birthday?: string;
    points: number;
    totalSpent: number;
    shopId?: string; // Added shopId
    createdAt: Date;
    updatedAt: Date;
}
