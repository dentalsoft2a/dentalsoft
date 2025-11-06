-- Complete Database Dump
-- Generated: 2025-11-06
-- Database: GB Dental Management System

-- =================================================================
-- CUSTOM TYPES
-- =================================================================

CREATE TYPE subscription_status_enum AS ENUM (
    'active',
    'past_due', 
    'inactive',
    'trialing',
    'canceled'
);

