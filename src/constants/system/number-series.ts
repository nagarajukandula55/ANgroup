/**
 * =========================================================
 * AN GROUP ERP PLATFORM
 * Number Series Engine
 * ---------------------------------------------------------
 * Domain Types
 * ---------------------------------------------------------
 * This file contains ONLY domain contracts.
 *
 * API DTOs belong in:
 *      src/types/api/number-series.ts
 *
 * Service contracts belong in:
 *      src/types/services/number-series.ts
 *
 * These interfaces are shared across:
 *
 * • Models
 * • Services
 * • React Hooks
 * • UI
 * • Validation
 * • Audit
 * • Workflow
 *
 * =========================================================
 */

import {
    NumberSeriesResetPolicy,
    NumberSeriesScope,
    NumberSeriesStatus,
    NumberSeriesVersionStatus,
} from "@/constants/system/numberSeries";

/* =========================================================
   COMMON TYPES
========================================================= */

export type ObjectId = string;

export type ISODateString = string;

/* =========================================================
   VARIABLE MAP
========================================================= */

export interface NumberSeriesVariableMap {

    ORG?: string;

    BUSINESS?: string;

    WAREHOUSE?: string;

    YEAR?: string;

    YY?: string;

    MONTH?: string;

    DAY?: string;

    FY?: string;

    SEQ?: string;

    [key: string]: string | undefined;
}

/* =========================================================
   RESET CONTEXT
========================================================= */

export interface NumberSeriesResetContext {

    currentDate: Date;

    previousGeneratedAt?: Date;

    financialYearStartMonth: number;

}

/* =========================================================
   PREVIEW RESULT
========================================================= */

export interface NumberSeriesPreview {

    value: string;

    sequence: number;

    variables: NumberSeriesVariableMap;

}

/* =========================================================
   GENERATED NUMBER
========================================================= */

export interface NumberSeriesGeneratedNumber {

    value: string;

    sequence: number;

    previousSequence: number;

    generatedAt: Date;

    resetApplied: boolean;

}

/* =========================================================
   BASE ENTITY
========================================================= */

export interface NumberSeriesBase {

    /**
     * Human readable name
     *
     * Example:
     * Purchase Order
     */
    name: string;

    /**
     * Unique code
     *
     * Example:
     * PURCHASE_ORDER
     */
    code: string;

    /**
     * Optional description
     */
    description?: string;

    /**
     * Prefix
     */
    prefix?: string;

    /**
     * Suffix
     */
    suffix?: string;

    /**
     * Separator
     */
    separator: string;

    /**
     * Zero padding
     */
    padding: number;

    /**
     * Initial sequence
     */
    startNumber: number;

    /**
     * Current sequence
     */
    currentNumber: number;

    /**
     * Increment
     */
    increment: number;

    /**
     * Reset policy
     */
    resetPolicy: NumberSeriesResetPolicy;

    /**
     * Scope
     */
    scope: NumberSeriesScope;

    /**
     * Enabled / Disabled
     */
    status: NumberSeriesStatus;

    /**
     * Allow generation
     */
    enabled: boolean;

}

/* =========================================================
   MAIN ENTITY
========================================================= */

export interface INumberSeries extends NumberSeriesBase {

    _id: ObjectId;

    organizationId?: ObjectId;

    businessId?: ObjectId;

    warehouseId?: ObjectId;

    /**
     * Entity owning this sequence
     *
     * Examples:
     * PURCHASE_ORDER
     * SALES_ORDER
     * VENDOR
     * CUSTOMER
     * MATERIAL
     */
    entity: string;

    /**
     * Optimistic locking version
     */
    version: number;

    /**
     * Soft delete
     */
    isDeleted: boolean;

    deletedAt?: Date;

    deletedBy?: ObjectId;

    /**
     * Audit
     */
    createdBy: ObjectId;

    updatedBy?: ObjectId;

    createdAt: Date;

    updatedAt: Date;

}
