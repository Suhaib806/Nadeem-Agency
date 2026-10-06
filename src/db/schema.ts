import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    role: text("role").notNull().default("order_booker"),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
    roleActiveIdx: index("idx_users_role_active").on(table.role, table.active),
  }),
);

export const shopsTable = pgTable(
  "shops",
  {
    id: serial("id").primaryKey(),
    shopCode: text("shop_code").notNull(),
    shopName: text("shop_name").notNull(),
    ownerName: text("owner_name").notNull(),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull().default(""),
    city: text("city").notNull().default(""),
    area: text("area").notNull().default("General"),
    assignedOrderBookerId: integer("assigned_order_booker_id"),
    creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }).$type<number>().notNull().default(0),
    status: text("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    shopCodeUnique: uniqueIndex("shops_shop_code_unique").on(table.shopCode),
    assignedBookerIdx: index("idx_shops_assigned_booker").on(table.assignedOrderBookerId),
    areaIdx: index("idx_shops_area").on(table.area),
    statusIdx: index("idx_shops_status").on(table.status),
  }),
);

export const productsTable = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    productCode: text("product_code").notNull(),
    productName: text("product_name").notNull(),
    company: text("company").notNull().default("Other"),
    category: text("category").notNull().default("General"),
    unit: text("unit").notNull().default("pcs"),
    price: numeric("price", { precision: 12, scale: 2 }).$type<number>().notNull().default(0),
    taxOrDiscount: numeric("tax_or_discount", { precision: 8, scale: 2 }).$type<number>().notNull().default(0),
    status: text("status").notNull().default("active"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productCodeUnique: uniqueIndex("products_product_code_unique").on(table.productCode),
    companyIdx: index("idx_products_company").on(table.company),
    statusIdx: index("idx_products_status").on(table.status),
  }),
);

export const ordersTable = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    shopId: integer("shop_id").notNull(),
    orderBookerId: integer("order_booker_id").notNull(),
    orderDate: date("order_date", { mode: "string" }).notNull(),
    orderTime: text("order_time").notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).$type<number>().notNull().default(0),
    discount: numeric("discount", { precision: 12, scale: 2 }).$type<number>().notNull().default(0),
    tax: numeric("tax", { precision: 12, scale: 2 }).$type<number>().notNull().default(0),
    grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).$type<number>().notNull().default(0),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderNumberUnique: uniqueIndex("orders_order_number_unique").on(table.orderNumber),
    dateStatusIdx: index("idx_orders_date_status").on(table.orderDate, table.status),
    bookerDateIdx: index("idx_orders_booker_date").on(table.orderBookerId, table.orderDate),
    shopDateIdx: index("idx_orders_shop_date").on(table.shopId, table.orderDate),
    createdAtIdx: index("idx_orders_created_at").on(table.createdAt),
  }),
);

export const orderItemsTable = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull(),
    productId: integer("product_id").notNull(),
    productCode: text("product_code").notNull(),
    productName: text("product_name").notNull(),
    unit: text("unit").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).$type<number>().notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).$type<number>().notNull(),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).$type<number>().notNull(),
  },
  (table) => ({
    orderIdIdx: index("idx_order_items_order_id").on(table.orderId),
    productIdIdx: index("idx_order_items_product_id").on(table.productId),
  }),
);

export const auditEventsTable = pgTable(
  "audit_events",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull(),
    action: text("action").notNull(),
    actorId: integer("actor_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderIdIdx: index("idx_audit_events_order_id").on(table.orderId),
  }),
);

export const usersRelations = relations(usersTable, ({ many }) => ({
  shops: many(shopsTable),
  orders: many(ordersTable),
  auditEvents: many(auditEventsTable),
}));

export const shopsRelations = relations(shopsTable, ({ one, many }) => ({
  assignedOrderBooker: one(usersTable, {
    fields: [shopsTable.assignedOrderBookerId],
    references: [usersTable.id],
  }),
  orders: many(ordersTable),
}));

export const productsRelations = relations(productsTable, ({ many }) => ({
  orderItems: many(orderItemsTable),
}));

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  shop: one(shopsTable, { fields: [ordersTable.shopId], references: [shopsTable.id] }),
  orderBooker: one(usersTable, { fields: [ordersTable.orderBookerId], references: [usersTable.id] }),
  items: many(orderItemsTable),
  audit: many(auditEventsTable),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, { fields: [orderItemsTable.orderId], references: [ordersTable.id] }),
  product: one(productsTable, { fields: [orderItemsTable.productId], references: [productsTable.id] }),
}));

export const auditEventsRelations = relations(auditEventsTable, ({ one }) => ({
  order: one(ordersTable, { fields: [auditEventsTable.orderId], references: [ordersTable.id] }),
  actor: one(usersTable, { fields: [auditEventsTable.actorId], references: [usersTable.id] }),
}));

export const companiesTable = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    logo: text("logo"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameUnique: uniqueIndex("companies_name_unique").on(table.name),
  }),
);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShopSchema = createInsertSchema(shopsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, createdAt: true, updatedAt: true });

export type User = typeof usersTable.$inferSelect;
export type Shop = typeof shopsTable.$inferSelect;
export type Product = typeof productsTable.$inferSelect;
export type DbCompany = typeof companiesTable.$inferSelect;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
export type AuditEvent = typeof auditEventsTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertShop = z.infer<typeof insertShopSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

