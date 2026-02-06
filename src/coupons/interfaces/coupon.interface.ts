export interface Coupon {
    id: number;
    code: string;
    title: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minPurchase: number;
    maxUses: number;
    usedCount: number;
    startDate?: Date;
    endDate?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
