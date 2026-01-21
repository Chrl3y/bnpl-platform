/**
 * API Routes Definition
 * RESTful endpoints for BNPL platform
 * 
 * Follows REST conventions and idempotency patterns
 * All monetary operations include idempotency keys
 */

// ============================================================================
// MERCHANT API
// ============================================================================

export const merchantRoutes = {
  /**
   * POST /api/merchant/checkout/authorize
   * Request merchant checkout, trigger credit check, allocate to lender, create contract
   * Response time SLA: <1 second
   * 
   * Request:
   * {
   *   "merchantId": "merch_123",
   *   "customerPhone": "+256701234567",
   *   "orderAmount": 500000,     // UGX
   *   "orderDescription": "iPhone 14 Pro",
   *   "tenor": 90,              // Days
   *   "idempotencyKey": "uuid"
   * }
   * 
   * Response (Success):
   * {
   *   "contractId": "contract_abc123",
   *   "status": "APPROVED",
   *   "approvedAmount": 500000,
   *   "tenor": 90,
   *   "installmentAmount": 168000,  // Monthly
   *   "authToken": "base64encoded",
   *   "expiresIn": 900
   * }
   */
  checkoutAuthorize: {
    method: 'POST',
    path: '/api/merchant/checkout/authorize',
    description: 'Authorize BNPL purchase',
  },

  /**
   * POST /api/merchant/orders/:orderId/confirm-delivery
   * Confirm order delivered, trigger merchant settlement
   * 
   * Response:
   * {
   *   "settlementId": "settlement_xyz",
   *   "amount": 485000,    // After fees
   *   "status": "COMPLETED"
   * }
   */
  confirmDelivery: {
    method: 'POST',
    path: '/api/merchant/orders/:orderId/confirm-delivery',
    description: 'Confirm delivery, initiate settlement',
  },

  /**
   * POST /api/merchant/orders/:orderId/refund
   * Process refund (delivery failure, customer request, etc.)
   * 
   * Request:
   * {
   *   "refundAmount": 500000,
   *   "reason": "DELIVERY_FAILURE",
   *   "idempotencyKey": "uuid"
   * }
   */
  refund: {
    method: 'POST',
    path: '/api/merchant/orders/:orderId/refund',
    description: 'Process refund',
  },

  /**
   * GET /api/merchant/profile
   * Get merchant profile and limits
   */
  getProfile: {
    method: 'GET',
    path: '/api/merchant/profile',
    description: 'Get merchant profile',
  },

  /**
   * GET /api/merchant/settlements
   * Get settlement history
   */
  getSettlements: {
    method: 'GET',
    path: '/api/merchant/settlements?limit=50&offset=0',
    description: 'Get settlement history',
  },
};

// ============================================================================
// CUSTOMER API
// ============================================================================

export const customerRoutes = {
  /**
   * POST /api/customer/authenticate
   * Authenticate customer (phone-based OTP)
   * 
   * Request:
   * {
   *   "phoneNumber": "+256701234567",
   *   "otp": "123456"
   * }
   * 
   * Response:
   * {
   *   "customerId": "cust_123",
   *   "token": "jwt_token",
   *   "expiresIn": 86400
   * }
   */
  authenticate: {
    method: 'POST',
    path: '/api/customer/authenticate',
    description: 'Authenticate customer with OTP',
  },

  /**
   * GET /api/customer/limits
   * Get customer's BNPL limits (real-time affordability)
   * 
   * Response:
   * {
   *   "employeeId": "emp_123",
   *   "maxAmount": 1500000,
   *   "availableAmount": 1200000,  // Considering existing deductions
   *   "monthlyDeductionCapacity": 75000,
   *   "riskTier": "TIER_1",
   *   "expiresAt": "2024-12-31T23:59:59Z"
   * }
   */
  getLimits: {
    method: 'GET',
    path: '/api/customer/limits',
    description: 'Get available credit limits',
  },

  /**
   * GET /api/customer/contracts
   * Get customer's active and past contracts
   * 
   * Response:
   * {
   *   "contracts": [
   *     {
   *       "contractId": "contract_abc",
   *       "merchantName": "Tech Store",
   *       "amount": 500000,
   *       "state": "IN_REPAYMENT",
   *       "nextPaymentDue": "2024-01-15T00:00:00Z",
   *       "nextPaymentAmount": 168000,
   *       "outstandingBalance": 336000,
   *       "paymentsCompleted": 1,
   *       "totalPayments": 3
   *     }
   *   ]
   * }
   */
  getContracts: {
    method: 'GET',
    path: '/api/customer/contracts',
    description: 'Get customer contracts',
  },

  /**
   * GET /api/customer/contracts/:contractId
   * Get contract details and payment schedule
   */
  getContractDetails: {
    method: 'GET',
    path: '/api/customer/contracts/:contractId',
    description: 'Get contract details',
  },

  /**
   * POST /api/customer/authorize-contract/:contractId
   * Confirm BNPL authorization (after merchant triggers checkout)
   * 
   * Request:
   * {
   *   "authToken": "base64encoded",
   *   "otp": "123456"
   * }
   */
  authorizeContract: {
    method: 'POST',
    path: '/api/customer/authorize-contract/:contractId',
    description: 'Confirm BNPL authorization',
  },
};

// ============================================================================
// EMPLOYER API
// ============================================================================

export const employerRoutes = {
  /**
   * POST /api/employer/register
   * Register employer with platform
   * 
   * Request:
   * {
   *   "businessName": "Stanbic Bank",
   *   "payrollCycle": "MONTHLY",
   *   "paymentGateway": "PESAPAL",
   *   "bankAccount": {
   *     "accountNumber": "0123456789",
   *     "bankCode": "005"
   *   }
   * }
   */
  register: {
    method: 'POST',
    path: '/api/employer/register',
    description: 'Register employer',
  },

  /**
   * POST /api/employer/employees/upload
   * Bulk upload employees (CSV)
   * 
   * Multipart form data:
   * - file: CSV with columns [phone, nationalId, netSalary]
   * 
   * Response:
   * {
   *   "totalRows": 1000,
   *   "successCount": 950,
   *   "errorCount": 50,
   *   "errors": [
   *     { "row": 5, "error": "Invalid salary range" }
   *   ]
   * }
   */
  bulkUploadEmployees: {
    method: 'POST',
    path: '/api/employer/employees/upload',
    description: 'Bulk upload employees',
  },

  /**
   * GET /api/employer/employees
   * Get all employees for employer
   */
  getEmployees: {
    method: 'GET',
    path: '/api/employer/employees?limit=100&offset=0',
    description: 'Get employees list',
  },

  /**
   * GET /api/employer/deductions/pending
   * Get pending deduction instructions for upcoming payroll
   * 
   * Response:
   * {
   *   "payrollDate": "2024-01-01",
   *   "totalDeductions": 45000000,
   *   "numberOfDeductions": 1200,
   *   "deductionDetails": [
   *     { "contractId": "contract_abc", "amount": 168000 }
   *   ]
   * }
   */
  getPendingDeductions: {
    method: 'GET',
    path: '/api/employer/deductions/pending',
    description: 'Get pending deductions for payroll',
  },

  /**
   * POST /api/employer/remittance
   * Submit payroll remittance (employee deductions received)
   * 
   * Request:
   * {
   *   "remittanceId": "remit_123",
   *   "payrollDate": "2024-01-01",
   *   "totalDeductions": 45000000,
   *   "deductionDetails": [
   *     { "contractId": "contract_abc", "amount": 168000 }
   *   ],
   *   "idempotencyKey": "uuid"
   * }
   * 
   * Response:
   * {
   *   "status": "CONFIRMED",
   *   "matchedCount": 1200,
   *   "unmatchedCount": 0,
   *   "variance": 0
   * }
   */
  submitRemittance: {
    method: 'POST',
    path: '/api/employer/remittance',
    description: 'Submit payroll remittance',
  },

  /**
   * GET /api/employer/payroll-report
   * Generate payroll report (showing BNPL impact on take-home)
   */
  getPayrollReport: {
    method: 'GET',
    path: '/api/employer/payroll-report?payrollDate=2024-01-01',
    description: 'Get payroll report with BNPL deductions',
  },

  /**
   * GET /api/employer/contracts
   * View all active contracts for employer's employees
   */
  getContracts: {
    method: 'GET',
    path: '/api/employer/contracts',
    description: 'Get contracts for employees',
  },
};

// ============================================================================
// LENDER API
// ============================================================================

export const lenderRoutes = {
  /**
   * POST /api/lender/register
   * Register lender (bank, MFI, fintech, etc.)
   * 
   * Request:
   * {
   *   "lenderName": "Equity Bank Uganda",
   *   "lenderType": "BANK",
   *   "capitalLimit": 5000000000,  // UGX
   *   "riskAppetite": "MODERATE",
   *   "apiKey": "secret_key"
   * }
   */
  register: {
    method: 'POST',
    path: '/api/lender/register',
    description: 'Register lender',
  },

  /**
   * POST /api/lender/products
   * Define lending products
   * 
   * Request:
   * {
   *   "productName": "BNPL_TIER_1",
   *   "minAmount": 100000,
   *   "maxAmount": 3000000,
   *   "tenor": 180,
   *   "interestRate": 0.30,
   *   "processingFee": 50000,
   *   "riskTierEligibility": ["TIER_1", "TIER_2"]
   * }
   */
  createProduct: {
    method: 'POST',
    path: '/api/lender/products',
    description: 'Create lending product',
  },

  /**
   * GET /api/lender/portfolio
   * Get lender's active portfolio (contracts, balance, PAR)
   * 
   * Response:
   * {
   *   "totalDisbursed": 2500000000,
   *   "totalOutstanding": 1800000000,
   *   "totalPaid": 700000000,
   *   "portfolio": [
   *     {
   *       "contractId": "contract_abc",
   *       "employeePhone": "***",
   *       "amount": 500000,
   *       "state": "IN_REPAYMENT",
   *       "nextPaymentDue": "2024-01-15",
   *       "outstandingBalance": 336000
   *     }
   *   ],
   *   "performance": {
   *     "par": 2.5,  // % of portfolio >30 days late
   *     "writeoffs": 50000000,
   *     "collections": 45000000
   *   }
   * }
   */
  getPortfolio: {
    method: 'GET',
    path: '/api/lender/portfolio?limit=1000&offset=0',
    description: 'Get portfolio overview',
  },

  /**
   * GET /api/lender/contracts
   * View detailed contracts (filterable by state, tenor, amount)
   */
  getContracts: {
    method: 'GET',
    path: '/api/lender/contracts?state=IN_REPAYMENT&limit=100',
    description: 'Get contracts with filters',
  },

  /**
   * GET /api/lender/performance
   * Performance metrics (PAR, collections, writeoffs)
   */
  getPerformance: {
    method: 'GET',
    path: '/api/lender/performance',
    description: 'Get performance metrics',
  },

  /**
   * POST /api/lender/webhook/repayment
   * Webhook for payment gateway to post repayments
   * (Called by PESAPAL, Flutterwave, etc. when payment received)
   */
  webhookRepayment: {
    method: 'POST',
    path: '/api/lender/webhook/repayment',
    description: 'Webhook for payment notifications',
  },
};

// ============================================================================
// INTERNAL/ADMIN API
// ============================================================================

export const adminRoutes = {
  /**
   * GET /api/admin/dashboard
   * Platform-wide KPIs
   * 
   * Response:
   * {
   *   "totalDisbursed": 10000000000,
   *   "totalOutstanding": 7500000000,
   *   "activeContracts": 50000,
   *   "par": 3.2,
   *   "collections": 2500000000,
   *   "lenderCount": 5,
   *   "merchantCount": 500,
   *   "employerCount": 150,
   *   "employeeCount": 500000
   * }
   */
  getDashboard: {
    method: 'GET',
    path: '/api/admin/dashboard',
    description: 'Get platform dashboard',
  },

  /**
   * GET /api/admin/contracts
   * View all contracts (filterable, exportable)
   */
  getAllContracts: {
    method: 'GET',
    path: '/api/admin/contracts',
    description: 'Get all contracts',
  },

  /**
   * POST /api/admin/reconciliation/run
   * Run reconciliation job (async)
   */
  runReconciliation: {
    method: 'POST',
    path: '/api/admin/reconciliation/run',
    description: 'Run reconciliation job',
  },

  /**
   * GET /api/admin/audit-log
   * Get audit trail (compliance)
   */
  getAuditLog: {
    method: 'GET',
    path: '/api/admin/audit-log?limit=1000',
    description: 'Get audit log',
  },

  /**
   * GET /api/admin/health
   * System health check
   */
  health: {
    method: 'GET',
    path: '/api/admin/health',
    description: 'Health check',
  },
};

// ============================================================================
// API DOCUMENTATION EXPORT
// ============================================================================

export const allRoutes = {
  merchant: merchantRoutes,
  customer: customerRoutes,
  employer: employerRoutes,
  lender: lenderRoutes,
  admin: adminRoutes,
};

/**
 * SECURITY & AUTHENTICATION
 * 
 * All endpoints require authentication:
 * - Merchants: API key (in Authorization header)
 * - Customers: JWT (from OTP login)
 * - Employers: API key + JWT
 * - Lenders: OAuth2 or API key
 * - Admin: OAuth2 (Google/GitHub)
 * 
 * All endpoints support idempotency via idempotencyKey header
 * Sensitive data redacted in logs (phone, national ID, account numbers)
 * 
 * RATE LIMITING
 * - Merchant: 100 req/min per API key
 * - Lender: 1000 req/min
 * - Admin: Unlimited
 * 
 * RESPONSE FORMAT
 * Success (2xx):
 * { "data": {...}, "success": true }
 * 
 * Error (4xx/5xx):
 * { "error": "Human-readable message", "code": "ERROR_CODE", "details": {...} }
 */
