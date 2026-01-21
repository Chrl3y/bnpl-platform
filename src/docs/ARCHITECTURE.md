/**
 * BNPL PLATFORM ARCHITECTURE DOCUMENTATION
 * 
 * Pay-Later Orchestration Engine for Uganda Market
 * Multi-Tenant, Multi-Lender Marketplace
 * 
 * Version: 1.0
 * Last Updated: 2024-01-01
 */

// ============================================================================
// 1. SYSTEM OVERVIEW
// ============================================================================

/**
 * WHAT IS BNPL (BUY NOW PAY LATER)?
 * 
 * BNPL is NOT a lending product form/application. It's a PAYMENT METHOD.
 * 
 * Traditional Lending Flow:
 * Customer → Lender → (months of approval) → Loan received → Use for spending
 * 
 * BNPL Flow:
 * Customer (at merchant POS) → BNPL Platform → Credit decision (seconds) → Payment split
 * 
 * Example:
 * - Customer buys iPhone 14 Pro for UGX 2,500,000 at a tech store
 * - Merchant asks: "Pay now or in installments?"
 * - Customer chooses: "Split into 3 months"
 * - BNPL platform (not merchant):
 *   1. Identifies customer by phone
 *   2. Checks credit instantly (net salary, deductions, CRB)
 *   3. Decides limit: Can approve UGX 2.5M
 *   4. Assigns to best lender (based on strategy)
 *   5. Pays merchant full amount (UGX 2.5M)
 *   6. Creates monthly payment plan for customer (UGX ~850K/month for 3 months)
 * - Customer repays via employer payroll deductions (employer pays lender)
 * 
 * KEY: Platform makes credit decision and payment routing, lenders provide capital.
 */

// ============================================================================
// 2. ARCHITECTURE PRINCIPLES
// ============================================================================

/**
 * PRINCIPLE 1: PAYMENT NETWORK, NOT LENDING APP
 * 
 * The platform is infrastructure (payment rails), not a lender.
 * Role: Match merchants ↔ customers ↔ lenders ↔ employers
 * Not responsible for: underwriting policy, credit loss
 * Responsible for: routing decisions, risk orchestration, settlement
 */

/**
 * PRINCIPLE 2: EMPLOYER-ANCHORED RISK MODEL
 * 
 * Traditional credit: Personal income + assets → Risk assessment
 * BNPL credit: Employment relationship + payroll deduction capability → Risk
 * 
 * Payroll deduction is enforcement mechanism:
 * - Employee agrees to payroll deduction
 * - Employer processes deduction
 * - Platform/Lender receives funds directly
 * - No customer collection needed
 * 
 * Enables:
 * - Instant credit decisions (<1 second)
 * - 0% default risk (employer is payer)
 * - Scaling to millions of customers
 * - Uganda market where traditional credit scoring weak
 */

/**
 * PRINCIPLE 3: MULTI-LENDER ORCHESTRATION
 * 
 * Platform supports N lenders simultaneously.
 * Each lender has:
 * - Capital limit (e.g., Equity Bank: UGX 5B deployed to BNPL)
 * - Product definitions (max amount, tenor, interest rate)
 * - Risk preferences (Tier 1 only? Include informal sector? Etc.)
 * 
 * Platform allocates each deal to best lender based on:
 * - Lender strategy (round-robin, risk-weighted, exclusive)
 * - Lender capital availability
 * - Lender product eligibility
 * - Customer risk tier
 * 
 * Enables:
 * - Lender competition → better pricing
 * - Risk diversification
 * - Scale beyond single lender capital
 * - Marketplace dynamics
 */

/**
 * PRINCIPLE 4: STATELESS, HORIZONTALLY SCALABLE SERVICES
 * 
 * No sticky sessions, no in-memory state.
 * Any server can handle any request.
 * 
 * Enables:
 * - Kubernetes deployment
 * - Auto-scaling under load
 * - Zero-downtime deployments
 * - Geographic distribution
 * - <1 second response times for critical paths
 */

/**
 * PRINCIPLE 5: EVENT-DRIVEN ASYNC ARCHITECTURE
 * 
 * Fast path (synchronous):
 * - Validate merchant → Check employee → Decide credit → Allocate lender → Return decision
 * 
 * Slow path (asynchronous):
 * - Create Mifos loan
 * - Send SMS notifications
 * - Trigger payment gateway
 * - Post audit logs
 * - Update reporting
 * 
 * Benefits:
 * - Checkout API stays <1 second
 * - Decoupled services can fail independently
 * - Retry logic for transient failures
 * - Support for multiple payment gateways, SMS providers
 */

/**
 * PRINCIPLE 6: MIFOS IS SYSTEM OF RECORD, NOT DECISION ENGINE
 * 
 * Mifos X is microfinance accounting system (double-entry ledger).
 * Used for: Regulatory reporting, loan book management, repayment posting
 * NOT used for: Credit decisions, underwriting, risk assessment
 * 
 * BNPL platform makes all decisions, then notifies Mifos.
 * Mifos is downstream system of record.
 * 
 * Enables:
 * - Real-time credit decisions (don't wait for Mifos)
 * - Mifos can be swapped for other accounting systems
 * - Clear separation of concerns
 */

// ============================================================================
// 3. CORE DOMAINS
// ============================================================================

/**
 * DOMAIN 1: BNPL CORE PLATFORM
 * 
 * Manages contract lifecycle:
 * PRE_APPROVED → ORDER_CREATED → CUSTOMER_AUTHORIZED → FUNDED → IN_REPAYMENT → CLOSED
 * 
 * Key operations:
 * - Create contract (after credit decision)
 * - Authorize payment (customer confirms)
 * - Fund contract (merchant paid)
 * - Track repayments (from payroll)
 * - Manage state transitions
 * 
 * Storage:
 * - Contracts table (one row per BNPL deal)
 * - Installments table (monthly payment schedule)
 * - State transition log (audit trail)
 */

/**
 * DOMAIN 2: CHECKOUT & AUTHORIZATION ENGINE
 * 
 * CRITICAL PATH: <1 second response required
 * 
 * Stateless endpoint that processes merchant checkouts:
 * 1. Validate merchant exists and is active
 * 2. Validate order (amount, tenor within range)
 * 3. Identify employee by phone number
 * 4. Look up existing contracts (for deduction history)
 * 5. Check employee KYC status
 * 6. Call credit engine (calculate affordable amount)
 * 7. Call multi-lender engine (pick best lender)
 * 8. Create contract in FUNDED state
 * 9. Generate auth token
 * 10. Return response
 * 11. ASYNC: Create Mifos loan, send SMS, log audit
 * 
 * Idempotency: All requests cached by idempotencyKey for 24 hours
 * Result: Same response if called twice with same key
 * 
 * Scalability: Stateless, can run on 100 servers, Kubernetes auto-scale
 */

/**
 * DOMAIN 3: CREDIT & LIMITS ENGINE
 * 
 * Real-time affordability calculation.
 * Input:
 * - Employee: salary, existing deductions, tier
 * - Employer: rules (max monthly deduction %)
 * - Lender: products (max amount, tenor)
 * - CRB: credit score
 * - History: past contracts, payment performance
 * 
 * Output:
 * - Approved amount (UGX)
 * - Tenor (days)
 * - Interest rate (%)
 * - Monthly payment (UGX)
 * - Confidence score (0-100)
 * 
 * Logic:
 * - Affordability = (Net Salary × Deduction Ratio) - Existing Deductions
 * - Deduction Ratio: TIER_1=40%, TIER_2=30%, TIER_3=20%
 * - Risk adjustment: CRB score, payment history reduce capacity
 * - Tenor constraint: TIER_1=6mo, TIER_2=4mo, TIER_3=3mo
 * 
 * NOT ML yet, but rule-based designed for ML integration:
 * - Structure allows scoring model replacement
 * - Explainability required (reasoning string in response)
 */

/**
 * DOMAIN 4: MULTI-LENDER ALLOCATION ENGINE
 * 
 * Distributes approved contracts to best lender.
 * 
 * Strategies:
 * 1. ROUND_ROBIN: Spread evenly (simple, fair)
 * 2. RISK_WEIGHTED: High risk → conservative lenders, low risk → aggressive lenders
 * 3. EMPLOYER_EXCLUSIVE: Specific employers partner with specific lenders
 * 4. PRIORITY: Lender preference (e.g., partner banks prioritized)
 * 
 * Constraints:
 * - Lender must have available capital
 * - Lender must have product for amount/tenor/tier
 * - Lender risk appetite must match
 * 
 * Output:
 * - Selected lender ID
 * - Allocated amount (UGX)
 * - Strategy used
 * - Reasoning
 */

/**
 * DOMAIN 5: PAYMENT & SETTLEMENT ENGINE
 * 
 * Handles money movement:
 * 1. Disbursement: Pay merchant after contract funded
 * 2. Repayment: Receive from employer payroll
 * 3. Refund: Reverse disbursement (delivery failure, etc.)
 * 4. Settlement: Pay lender their share
 * 
 * Escrow/Hold/Release Pattern:
 * - Funds held until all conditions met
 * - Settlement only after verification
 * - Audit trail for all transactions
 * 
 * Idempotency:
 * - All financial operations have idempotencyKey
 * - Same request returns same result (no double-charging)
 * - Critical for payment gateways (Pesapal, Flutterwave, etc.)
 * 
 * Ledger:
 * - Internal double-entry ledger (audit trail)
 * - All debits/credits recorded
 * - Reconciliation capability
 */

/**
 * DOMAIN 6: EMPLOYER & PAYROLL INTEGRATION
 * 
 * Connects employers' payroll systems to BNPL platform.
 * 
 * Flow:
 * 1. Employer uploads employee CSV (phone, national ID, salary)
 * 2. Platform creates employee records, assigns risk tier
 * 3. Contract created, generates deduction instruction
 * 4. Employer processes payroll, sends CSV with deductions
 * 5. Platform matches deductions to contracts, updates balances
 * 6. Employer remits funds to payment gateway
 * 7. Platform receives, distributes to lender
 * 
 * Key Features:
 * - Risk tier assignment (salary-based)
 * - Deduction limit per employee (30% of salary)
 * - Bulk upload (1000s of employees)
 * - Payroll cycle awareness (monthly, weekly, daily)
 * - Compliance & audit trail
 * - Payroll report generation (show BNPL impact on take-home)
 */

/**
 * DOMAIN 7: LOAN ORCHESTRATION (MIFOS X ADAPTER)
 * 
 * Posts BNPL decisions to Mifos X (system of record).
 * 
 * NOT a decision engine - Mifos just records what BNPL decided.
 * 
 * Operations:
 * 1. Create loan in Mifos (after BNPL contract created)
 * 2. Post repayments (when payroll received)
 * 3. Update schedule & balance (as payments come in)
 * 4. Generate regulatory reports
 * 
 * Design:
 * - Async event-driven (don't block BNPL decision)
 * - Idempotent (safe to retry)
 * - Reconciliation job to check consistency
 * - Can be replaced with other systems later
 */

/**
 * DOMAIN 8: NOTIFICATION SERVICE
 * 
 * Sends real-time alerts to customers, employers, lenders.
 * 
 * Channels:
 * - SMS (primary for Uganda market, high penetration)
 * - Email (for merchants, employers)
 * - WhatsApp (future)
 * 
 * Events:
 * - APPROVAL: "Your UGX 500K BNPL for iPhone approved! UGX 168K/month"
 * - AUTHORIZATION_REQUEST: "Confirm UGX 500K at Tech Store?"
 * - PAYMENT_CONFIRMATION: "Payment received UGX 168K. Due: UGX 336K"
 * - DEDUCTION_NOTICE: "Payroll deduction: UGX 168K for BNPL"
 * - ALERT: "Payment overdue. Due now: UGX 168K"
 * 
 * Design:
 * - Queue-based (email/SMS can fail, retry later)
 * - Template-driven (customizable messages)
 * - Opt-out capability (compliance)
 * - Delivery tracking
 */

/**
 * DOMAIN 9: RECONCILIATION & AUDITING
 * 
 * Ensures financial accuracy and compliance.
 * 
 * Jobs:
 * 1. Daily settlement reconciliation (payment gateway ↔ BNPL)
 * 2. Payroll reconciliation (employer remittance ↔ deduction instructions)
 * 3. Mifos reconciliation (BNPL contract ↔ Mifos loan)
 * 4. PAR calculation (past-due tracking)
 * 5. Collections forecasting
 * 
 * Audit Trail:
 * - Every action logged (who, what, when, why)
 * - Immutable ledger
 * - Regulatory compliance (CBK, FRA reporting)
 * - Dispute resolution
 */

// ============================================================================
// 4. DATA MODEL
// ============================================================================

/**
 * CORE ENTITIES
 * 
 * Employer
 * - id, name, country, payrollCycle, bankAccount, riskProfile
 * - Employer has many employees
 * 
 * Employee
 * - id, employerId, phone, nationalId, netSalary, deductionLimit, riskTier
 * - Employee has many contracts, deductions
 * 
 * Merchant
 * - id, businessName, mcc, settlementAccount, riskProfile, dailyLimit
 * - Merchant creates many orders/contracts
 * 
 * Lender
 * - id, name, type, capitalLimit, capitalUtilized, riskAppetite
 * - Lender funds many contracts
 * 
 * LenderProduct
 * - id, lenderId, productName, minAmount, maxAmount, tenor, interestRate, fee
 * - Defines what lender will fund
 * 
 * BNPLContract
 * - id, employeeId, merchantId, lenderId, mifosLoanId
 * - orderAmount, tenor, interestRate, processingFee, totalPayable
 * - state, stateTransitionHistory
 * - installments[], totalPaid, totalDue, pastDueAmount
 * - timestamps: createdAt, fundedAt, closedAt
 * 
 * BNPLInstallment
 * - id, contractId, installmentNumber, dueDate, amount
 * - status (PENDING, PAID, OVERDUE, WRITTEN_OFF)
 * - paidDate, paidAmount
 * 
 * DeductionInstruction
 * - id, employeeId, contractId, monthlyDeduction
 * - startDate, endDate, status
 * - Tells employer how much to deduct from payroll
 * 
 * PayrollRemittance
 * - id, employerId, payrollDate, totalDeductions
 * - deductionDetails: [{contractId, amount}]
 * - status (PENDING, CONFIRMED, POSTED, FAILED)
 * - Employer reports deductions sent
 * 
 * SettlementInstruction
 * - id, merchantId, contractId, amount, fees
 * - status (PENDING, COMPLETED, FAILED, REVERSED)
 * - Merchant payment instruction
 * 
 * InternalLedgerEntry
 * - id, contractId, type (DISBURSEMENT, REPAYMENT, FEE, REVERSAL, ADJUSTMENT)
 * - amount (signed), account, reference, timestamp
 * - Audit trail of all money movement
 * 
 * MifosLoanLink
 * - bnplContractId ↔ mifosLoanId
 * - Bidirectional link for integration
 * 
 * CRBCheckResult
 * - employeeId, score, riskFlags, overallStatus, checkDate
 * - Credit reference bureau data
 */

// ============================================================================
// 5. API CONTRACTS (KEY ENDPOINTS)
// ============================================================================

/**
 * MERCHANT API
 * 
 * POST /api/merchant/checkout/authorize
 * Request: { merchantId, customerPhone, orderAmount, tenor, idempotencyKey }
 * Response: { contractId, status, approvedAmount, authToken, expiresIn }
 * SLA: <1 second
 * Auth: API Key
 * 
 * POST /api/merchant/orders/:orderId/confirm-delivery
 * Request: { orderId }
 * Response: { settlementId, amount, status }
 * Auth: API Key
 * 
 * POST /api/merchant/orders/:orderId/refund
 * Request: { refundAmount, reason, idempotencyKey }
 * Response: { reversalId }
 * Auth: API Key
 */

/**
 * CUSTOMER API
 * 
 * POST /api/customer/authenticate
 * Request: { phoneNumber, otp }
 * Response: { customerId, token, expiresIn }
 * Auth: None (OTP-based)
 * 
 * GET /api/customer/limits
 * Response: { maxAmount, availableAmount, monthlyDeductionCapacity, riskTier }
 * Auth: JWT
 * 
 * GET /api/customer/contracts
 * Response: { contracts: [{id, merchant, amount, state, nextPayment}] }
 * Auth: JWT
 * 
 * POST /api/customer/authorize-contract/:contractId
 * Request: { authToken, otp }
 * Response: { status: "AUTHORIZED" }
 * Auth: JWT
 */

/**
 * EMPLOYER API
 * 
 * POST /api/employer/register
 * Request: { businessName, payrollCycle, paymentGateway, bankAccount }
 * Response: { employerId, apiKey }
 * Auth: OAuth2
 * 
 * POST /api/employer/employees/upload
 * Request: multipart CSV
 * Response: { totalRows, successCount, errorCount, errors: [] }
 * Auth: API Key
 * 
 * GET /api/employer/deductions/pending?payrollDate=...
 * Response: { payrollDate, totalDeductions, deductionDetails: [{contractId, amount}] }
 * Auth: API Key
 * 
 * POST /api/employer/remittance
 * Request: { payrollDate, totalDeductions, deductionDetails, idempotencyKey }
 * Response: { status, matchedCount, variance }
 * Auth: API Key
 */

/**
 * LENDER API
 * 
 * POST /api/lender/register
 * Request: { lenderName, lenderType, capitalLimit, riskAppetite }
 * Response: { lenderId, apiKey }
 * Auth: OAuth2
 * 
 * POST /api/lender/products
 * Request: { productName, minAmount, maxAmount, tenor, interestRate, processingFee }
 * Response: { productId }
 * Auth: API Key
 * 
 * GET /api/lender/portfolio
 * Response: { totalDisbursed, totalOutstanding, portfolio: [...], performance: {...} }
 * Auth: API Key
 * 
 * GET /api/lender/contracts?state=...
 * Response: { contracts: [{contractId, amount, state, schedule}], total }
 * Auth: API Key
 */

// ============================================================================
// 6. FAILURE HANDLING & RESILIENCE
// ============================================================================

/**
 * IDEMPOTENCY
 * 
 * Problem: Payment gateways may retry requests on timeout
 * Solution: Idempotency keys cache
 * 
 * All state-changing operations (checkout, refund, settlement, remittance):
 * - Accept optional idempotencyKey in request
 * - Cache response for 24 hours
 * - If duplicate request: return cached response (not new operation)
 * 
 * Implementation:
 * - Redis cache (fast, distributed)
 * - Key format: "{operationType}_{idempotencyKey}"
 * - TTL: 24 hours
 */

/**
 * CIRCUIT BREAKER
 * 
 * If external service fails (Mifos, payment gateway, SMS provider):
 * - Fail fast (don't retry indefinitely)
 * - Return user-friendly error
 * - Queue for retry (async)
 * - Don't block critical path
 * 
 * Example: Mifos create loan fails
 * - BNPL checkout still succeeds (contract created, customer approved)
 * - Event published to retry queue
 * - Background job retries creation
 * - Reconciliation job detects mismatch, corrects
 */

/**
 * RETRY LOGIC
 * 
 * Exponential backoff for transient failures:
 * - Attempt 1: immediately
 * - Attempt 2: after 1 second
 * - Attempt 3: after 4 seconds
 * - Attempt 4: after 16 seconds
 * - Max 5 attempts, then escalate to ops team
 */

/**
 * COMPENSATION TRANSACTIONS
 * 
 * If operation partially succeeds:
 * 
 * Example: Checkout flow
 * 1. Create contract ✓
 * 2. Create Mifos loan ✗ (timeout)
 * 
 * Compensation:
 * - Mark contract as "MIFOS_PENDING"
 * - Publish event: CREATE_MIFOS_LOAN with contractId
 * - Background worker will eventually succeed
 * - If 24 hours elapse without success: alert ops, create support ticket
 */

// ============================================================================
// 7. DEPLOYMENT & SCALABILITY
// ============================================================================

/**
 * SERVICE TOPOLOGY
 * 
 * Microservices (each scales independently):
 * 1. Checkout API (critical path) - 10-100 instances during peak
 * 2. Credit Engine - CPU-bound, 5-50 instances
 * 3. Multi-Lender Engine - Fast, 2-10 instances
 * 4. Payment Settlement - I/O-bound, 5-50 instances
 * 5. Employer Payroll - Batch-processing, 2-5 instances
 * 6. Mifos Adapter - I/O-bound, 5-20 instances
 * 7. Notification Service - Queue-driven, 5-50 instances
 * 8. Reconciliation Jobs - Scheduled, 1-3 instances
 * 
 * Data Layer:
 * - PostgreSQL (primary transactional store)
 * - Redis (cache, session, idempotency)
 * - Event streaming (Kafka/Pulsar for async events)
 * - S3 (audit logs, reports)
 */

/**
 * DEPLOYMENT PIPELINE
 * 
 * Development: localhost:5173 (React dev server)
 * Staging: k8s.staging.bnpl.local (full environment)
 * Production: k8s.prod.bnpl.local (multi-region)
 * 
 * CI/CD:
 * 1. Push to GitHub
 * 2. Run tests (unit, integration)
 * 3. Build Docker images
 * 4. Deploy to staging (canary)
 * 5. Run smoke tests
 * 6. Deploy to production (rolling)
 */

/**
 * MONITORING & OBSERVABILITY
 * 
 * Metrics:
 * - Checkout API latency (p50, p95, p99)
 * - Contract conversion rate
 * - Lender allocation distribution
 * - Settlement failure rate
 * - Payroll reconciliation variance
 * - Mifos sync latency
 * 
 * Logs:
 * - Structured JSON logs (ELK stack)
 * - Redacted PII (phone → last 4 digits, ID → hash)
 * - Trace IDs for request correlation
 * 
 * Alerts:
 * - Checkout latency > 2 seconds
 * - Error rate > 1%
 * - Settlement failure rate > 0.1%
 * - Mifos sync lag > 1 hour
 */

// ============================================================================
// 8. MENTAL MODEL FOR DEVELOPERS
// ============================================================================

/**
 * THINK OF BNPL PLATFORM AS:
 * 
 * A PAYMENT NETWORK (not a bank)
 * - Infrastructure connecting merchants ↔ customers ↔ lenders ↔ employers
 * - Like VISA/Mastercard routing, but for split payments
 * 
 * MULTI-SIDED MARKETPLACE
 * - Merchants: Want to sell more (offer installments)
 * - Customers: Want affordability (split payments)
 * - Lenders: Want yield (deploy capital)
 * - Employers: Want employee retention (enable consumption)
 * 
 * ORCHESTRATION ENGINE
 * - Receive merchant checkout → Decide approval → Pick lender → Route funds
 * - Real-time, stateless, scalable
 * 
 * NOT:
 * - A lending app (doesn't make underwriting decisions)
 * - A payment gateway (processes payments, but also routes credit)
 * - A bank (doesn't hold funds, passes through)
 * - A fintech app (may have UI for operators, but core is backend APIs)
 */

/**
 * KEY DESIGN PATTERNS
 * 
 * 1. STATE MACHINE: Contract lifecycle strictly defined
 * 2. SAGA: Distributed transaction across services (checkout flow)
 * 3. EVENT SOURCING: Immutable ledger of all transactions
 * 4. CIRCUIT BREAKER: Fail gracefully when external service down
 * 5. IDEMPOTENCY: Safe to retry any operation
 * 6. CACHE-ASIDE: CRB checks, employee lookups cached 24 hours
 * 7. BULKHEAD: Separate thread pools per service (one failure doesn't cascade)
 * 8. CHOREOGRAPHY: Services react to events (not centralized orchestrator)
 */

export default {
  version: '1.0',
  lastUpdated: '2024-01-01',
  domains: 9,
  microservices: 9,
  coreEntities: 12,
  maintenanceStandardsDocument: true,
};
