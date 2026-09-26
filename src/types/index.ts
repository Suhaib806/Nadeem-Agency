export type UserRole = "admin" | "order_booker";

export interface User {
  id: number;
  name: string;
  role: UserRole;
  email: string;
  active: boolean;
  ordersToday?: number;
  salesToday?: number;
}

export interface Shop {
  id: number;
  shopCode: string;
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  area: string;
  assignedOrderBookerId: number | null;
  assignedOrderBookerName?: string | null;
  creditLimit: number;
  status: string;
  notes?: string | null;
  ordersToday?: number;
}

export interface Product {
  id: number;
  productCode: string;
  productName: string;
  company: string;
  category: string;
  unit: string;
  price: number;
  taxOrDiscount: number;
  status: string;
  imageUrl?: string | null;
  ordersToday?: number;
}

export interface OrderItemInput {
  productId: number;
  quantity: number;
}

export interface OrderItem {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface AuditEvent {
  id: number;
  action: string;
  actorName: string;
  createdAt: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  shopId: number;
  shopName: string;
  shopCode: string;
  orderBookerId: number;
  orderBookerName: string;
  orderDate: string;
  orderTime: string;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  status: "submitted" | "pending" | "cancelled" | string;
  createdAt: string;
  items?: OrderItem[];
  audit?: AuditEvent[];
}

export interface DashboardSummary {
  date: string;
  totalOrders: number;
  shopsVisited: number;
  totalSales: number;
  activeOrderBookers: number;
  pendingOrders: number;
  cancelledOrders: number;
  salesByBooker: Array<{
    userId: number;
    name: string;
    orders: number;
    sales: number;
    shopsVisited: number;
  }>;
}
