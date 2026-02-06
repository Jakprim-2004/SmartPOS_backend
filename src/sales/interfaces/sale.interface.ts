export interface Sale {
    id: number;
    billNumber: string;
    customerId?: number;
    items: SaleItem[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: 'cash' | 'card' | 'qr' | 'transfer' | 'scan' | 'promptpay';
    amountReceived?: number;
    changeAmount?: number;
    status: 'completed' | 'held' | 'cancelled';
    couponCode?: string | null;
    createdAt: Date;
    updatedAt: Date;
    customer?: any;
    staff?: any;
}

export interface SaleItem {
    id: number;
    productId?: number;
    productName: string;
    price: number;
    quantity: number;
    subtotal: number;
}
