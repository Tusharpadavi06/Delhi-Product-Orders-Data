export interface OrderItem {
  id: string;
  unit: string;          // Col F (6)
  itemName: string;      // Col G (7)
  color: string;         // Col H (8)
  width: string;         // Col I (9)
  unitOfItem: string;    // Col J (10)
  qty: number;           // Col K (11) - Total Order Qty
  rate: number;          // Col L (12)
  discount: number;      // Col M (13)
  deliveryDate: string;  // Col N (14)
  dispatchQty?: number;  // Col Y (25) - Manual user entry / Sheet Col Y
  balanceQty?: number;   // Col Z (26) - K - Y
  statusAN?: 'Open' | 'In-Progress' | 'Closed'; // Col AN (40) - Status Dropdown
  isDuplicate?: boolean;
  duplicateCount?: number;
  duplicateGroupIndex?: number;
}

export interface ProductOrderRow {
  orderId: string;
  referenceNo?: string;        // Col 1: Order No (e.g. GNZ-468115)
  timestamp: string;          // Col 2: Timestamp
  customerPO: string;         // Col 3: Customer PO
  customerName: string;       // Col 4: Customer Name
  customerEmail: string;      // Col 5: Customer Email
  orderDate: string;          // Col 6: Order Date
  unit: string;               // Col 7: Unit (Category)
  itemName: string;           // Col 8: Item Name
  color: string;              // Col 9: Color
  width: string;              // Col 10: Width
  unitOfItem: string;         // Col 11: Unit (of item)
  qty: number;                // Col 12: Qty
  rate: number;               // Col 13: Rate
  discount: number;           // Col 14: Discount
  deliveryDate: string;       // Col 15: Delivery Date
  remark: string;             // Col 16: Remark
  customerNumber: string;     // Col 17: Customer Number
  billingAddress: string;     // Col 18: Billing Address
  deliveryAddress: string;    // Col 19: Delivery Address
  transporterName: string;    // Col 20: Transporter Name
  salesPerson: string;        // Col 21: Sales Person Name
  accountStatus: string;      // Col 22: Account Status
  branch: string;             // Col 23: Branch
  approvalStatus: string;     // Col 24: Approval Status
  branchHeadName: string;     // Col 25: Branch Head Name
  branchHeadEmail?: string;   // Col 26: Branch Head Email
  orderNo?: string;           // Col 27: Order No (O.N Generate) / Col X (24)
  orderNoTimestamp?: string;  // Col 28: Timestamp ( O.N Generate )
  statusAN?: 'Open' | 'In-Progress' | 'Closed'; // Col AN (40)
  dispatchQty?: number;       // Col Y (25)
  balanceQty?: number;        // Col Z (26)
  // Operational columns AA to AS persisted per row from Google Sheet
  colAA?: string;             // Col AA (27): Status
  colAB?: string;             // Col AB (28): Remark
  colAC?: string;             // Col AC (29): Confirmation Mail
  colAD?: string;             // Col AD (30): Mail Status
  colAE?: string;             // Col AE (31): Confirmation Msg
  colAG?: boolean;            // Col AG (33): Follow-up 1
  colAH?: string;             // Col AH (34): Follow-up 1 Timestamp
  colAI?: string;             // Col AI (35): Follow-up 1 Remark
  colAJ?: boolean;            // Col AJ (36): Follow-up 2
  colAK?: string;             // Col AK (37): Follow-up 2 Timestamp
  colAL?: string;             // Col AL (38): Follow-up 2 Remark
  lrNumber?: string;          // Col AM (39): LR- Number
  colAO?: string;             // Col AO (41): Delivered Whatspp Msg
  sheetSource?: 'product_order' | 'automation' | 'closed';
}

export interface GroupedOrder {
  orderKey: string;
  referenceNo?: string;
  timestamp: string;
  customerPO: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  items: OrderItem[];
  remark: string;
  customerNumber: string;
  billingAddress: string;
  deliveryAddress: string;
  transporterName: string;
  salesPerson: string;
  accountStatus: string;
  branch: string;
  approvalStatus: string;
  branchHeadName?: string;
  branchHeadEmail?: string;
  orderNo: string;
  orderNoTimestamp?: string;
  statusAN?: 'Open' | 'In-Progress' | 'Closed';
  colAA?: string;
  colAB?: string;
  colAC?: string;
  colAD?: string;
  colAE?: string;
  colAG?: boolean;
  colAH?: string;
  colAI?: string;
  colAJ?: boolean;
  colAK?: string;
  colAL?: string;
  lrNumber?: string;
  colAO?: string;
  sheetSource?: 'product_order' | 'automation' | 'closed';
}

export interface ColumnMapItem {
  sheetCol: string;       // e.g. "A", "F", "K", "Y", "Z"
  colIndex1Based: number; // 1 to 26
  arrayIndex0Based: number;
  name: string;
  category: 'header-merge' | 'item-row' | 'dispatch-balance';
  description: string;
  example: string;
}
