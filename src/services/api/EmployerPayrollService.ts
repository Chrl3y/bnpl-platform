/**
 * Employer & Payroll Integration Service
 * Handles:
 * - Employee bulk upload (CSV)
 * - Deduction instruction generation
 * - Payroll cycle awareness
 * - Remittance reconciliation
 * - Compliance & audit
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Employee,
  Employer,
  DeductionInstruction,
  PayrollRemittance,
  EmployeePayrollRecord,
} from './types';

export interface EmployerIntegrationDependencies {
  employeeRepo: {
    create: (employee: Employee) => Promise<Employee>;
    update: (employee: Employee) => Promise<void>;
    getByEmployer: (employerId: string) => Promise<Employee[]>;
  };
  deductionRepo: {
    create: (deduction: DeductionInstruction) => Promise<DeductionInstruction>;
    update: (deduction: DeductionInstruction) => Promise<void>;
    getActive: (employerId: string) => Promise<DeductionInstruction[]>;
  };
  auditLog: { record: (event: any) => Promise<void> };
  compliance: { validateSalary: (salary: number) => boolean };
}

export interface BulkUploadResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: { row: number; error: string }[];
}

export class EmployerPayrollService {
  // Minimum salary for Uganda (UGX)
  private static readonly MINIMUM_SALARY_UGX = 150_000; // ~$40 USD, regulatory minimum
  private static readonly MAXIMUM_SALARY_UGX = 50_000_000; // Sanity check

  /**
   * Parse and upload employee CSV
   * Expected format: phoneNumber, nationalId, netSalary, ...
   */
  public static async bulkUploadEmployees(
    employerId: string,
    csvData: string,
    deps: EmployerIntegrationDependencies
  ): Promise<BulkUploadResult> {
    const lines = csvData.split('\n').filter((line) => line.trim());
    const results: BulkUploadResult = {
      totalRows: lines.length - 1, // Exclude header
      successCount: 0,
      errorCount: 0,
      errors: [],
    };

    // Parse header
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const phoneIdx = header.indexOf('phone');
    const idIdx = header.indexOf('nationalid');
    const salaryIdx = header.indexOf('netsalary');

    if (phoneIdx === -1 || idIdx === -1 || salaryIdx === -1) {
      throw new Error('Invalid CSV format. Required columns: phone, nationalId, netSalary');
    }

    // Process rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = lines[i].split(',').map((val) => val.trim());

        const phoneNumber = row[phoneIdx];
        const nationalId = row[idIdx];
        const netSalary = parseInt(row[salaryIdx], 10);

        // Validate
        if (!phoneNumber || !nationalId || !netSalary) {
          results.errors.push({ row: i, error: 'Missing required fields' });
          results.errorCount++;
          continue;
        }

        if (netSalary < this.MINIMUM_SALARY_UGX || netSalary > this.MAXIMUM_SALARY_UGX) {
          results.errors.push({
            row: i,
            error: `Salary out of range (${this.MINIMUM_SALARY_UGX} - ${this.MAXIMUM_SALARY_UGX} UGX)`,
          });
          results.errorCount++;
          continue;
        }

        // Determine risk tier based on salary
        let riskTier: 'TIER_1' | 'TIER_2' | 'TIER_3' = 'TIER_3';
        if (netSalary >= 1_000_000) riskTier = 'TIER_1'; // 1M+ UGX
        if (netSalary >= 500_000) riskTier = 'TIER_2'; // 500K+ UGX

        // Create employee
        const employee: Employee = {
          id: uuidv4(),
          employerId,
          nationalId,
          phoneNumber,
          netSalary,
          deductionLimit: netSalary * 0.30, // 30% of salary max
          existingDeductions: [],
          riskTier,
          kyc: { verified: false },
          isActive: true,
          createdAt: new Date(),
        };

        const created = await deps.employeeRepo.create(employee);
        results.successCount++;

        // Audit
        await deps.auditLog.record({
          type: 'EMPLOYEE_ONBOARDED',
          employerId,
          employeeId: created.id,
          salary: netSalary,
          riskTier,
          timestamp: new Date(),
        });
      } catch (error) {
        results.errors.push({ row: i, error: (error as Error).message });
        results.errorCount++;
      }
    }

    return results;
  }

  /**
   * Generate deduction instructions for a contract
   * Splits amount across payroll cycles
   */
  public static async generateDeductionInstructions(
    employerId: string,
    contractId: string,
    employeeId: string,
    monthlyDeduction: number,
    tenor: number, // Days
    employer: Employer,
    deps: EmployerIntegrationDependencies
  ): Promise<DeductionInstruction[]> {
    const deductions: DeductionInstruction[] = [];
    const numberOfMonths = Math.ceil(tenor / 30);

    // Start date: next payroll cycle
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() + 1);
    startDate.setDate(1); // First of next month

    // Create one deduction per payroll cycle
    for (let i = 0; i < numberOfMonths; i++) {
      const cycleDate = new Date(startDate);
      if (employer.payrollCycle === 'WEEKLY') {
        cycleDate.setDate(cycleDate.getDate() + i * 7);
      } else if (employer.payrollCycle === 'DAILY') {
        cycleDate.setDate(cycleDate.getDate() + i);
      } else {
        // MONTHLY (default)
        cycleDate.setMonth(cycleDate.getMonth() + i);
      }

      const deduction: DeductionInstruction = {
        id: uuidv4(),
        employeeId,
        contractId,
        monthlyDeduction,
        startDate: cycleDate,
        endDate: new Date(cycleDate.getTime() + 30 * 24 * 60 * 60 * 1000), // ~30 days
        status: 'PENDING_PAYROLL',
      };

      deductions.push(deduction);
      await deps.deductionRepo.create(deduction);
    }

    // Audit
    await deps.auditLog.record({
      type: 'DEDUCTION_INSTRUCTIONS_GENERATED',
      contractId,
      employeeId,
      employerId,
      numberOfInstructions: numberOfMonths,
      monthlyDeduction,
      tenor,
      timestamp: new Date(),
    });

    return deductions;
  }

  /**
   * Prepare payroll submission for employer
   * Returns pending deductions grouped by cycle
   */
  public static async preparePendingDeductions(
    employerId: string,
    payrollDate: Date,
    deps: EmployerIntegrationDependencies
  ): Promise<PayrollRemittance> {
    // Get all active deductions for employer
    const activeDeductions = await deps.deductionRepo.getActive(employerId);

    // Filter for this payroll cycle (±3 days window)
    const cycleStart = new Date(payrollDate);
    cycleStart.setDate(cycleStart.getDate() - 3);
    const cycleEnd = new Date(payrollDate);
    cycleEnd.setDate(cycleEnd.getDate() + 3);

    const deductionsForCycle = activeDeductions.filter((d) => {
      const dueDate = d.startDate;
      return dueDate >= cycleStart && dueDate <= cycleEnd;
    });

    // Group by contract
    const deductionsByContract = deductionsForCycle.map((d) => ({
      contractId: d.contractId,
      amount: d.monthlyDeduction,
    }));

    const totalDeductions = deductionsByContract.reduce((sum, d) => sum + d.amount, 0);

    const remittance: PayrollRemittance = {
      id: uuidv4(),
      employerId,
      payrollDate,
      totalDeductions,
      numberOfDeductions: deductionsByContract.length,
      deductionDetails: deductionsByContract,
      status: 'PENDING',
      createdAt: new Date(),
    };

    return remittance;
  }

  /**
   * Reconcile payroll remittance
   * Verify all deductions received match expected
   */
  public static async reconcileRemittance(
    remittanceId: string,
    receivedAmount: number,
    expectedAmount: number,
    employerId: string,
    deps: EmployerIntegrationDependencies
  ): Promise<{ success: boolean; variance: number; status: string }> {
    const variance = Math.abs(receivedAmount - expectedAmount);
    const variancePercent = (variance / expectedAmount) * 100;

    // Allow 5% variance (rounding, late entries)
    const reconciled = variancePercent <= 5;

    // Audit
    await deps.auditLog.record({
      type: 'REMITTANCE_RECONCILED',
      remittanceId,
      employerId,
      expectedAmount,
      receivedAmount,
      variance,
      reconciled,
      timestamp: new Date(),
    });

    return {
      success: reconciled,
      variance,
      status: reconciled ? 'CONFIRMED' : 'VARIANCE_FLAG',
    };
  }

  /**
   * Generate payroll report (for HR/finance)
   * Shows impact of BNPL deductions on take-home pay
   */
  public static async generatePayrollReport(
    employerId: string,
    payrollDate: Date,
    employees: Employee[],
    deps: EmployerIntegrationDependencies
  ): Promise<EmployeePayrollRecord[]> {
    const reports: EmployeePayrollRecord[] = [];

    for (const employee of employees) {
      // Get active deductions for this employee
      const activeDeductions = await deps.deductionRepo.getActive(employerId);
      const employeeDeductions = activeDeductions.filter((d) => d.employeeId === employee.id);

      const totalDeductions = employeeDeductions.reduce((sum, d) => sum + d.monthlyDeduction, 0);

      const record: EmployeePayrollRecord = {
        employeeId: employee.id,
        payrollCycle: payrollDate,
        netSalary: employee.netSalary,
        deductions: employeeDeductions.map((d) => ({
          contractId: d.contractId,
          amount: d.monthlyDeduction,
        })),
        totalDeductions,
        netAfterDeductions: employee.netSalary - totalDeductions,
      };

      reports.push(record);
    }

    return reports;
  }
}

export default EmployerPayrollService;
