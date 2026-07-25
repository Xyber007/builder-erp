-- Production-Ready Database Schema for Builder ERP / Construction MIS
-- PostgreSQL dialect

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS customer_timeline CASCADE;
DROP TABLE IF EXISTS customer_notes CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS demands CASCADE;
DROP TABLE IF EXISTS bank_loans CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS payment_schedules CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS buildings CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS unit_status CASCADE;
DROP TYPE IF EXISTS milestone_status CASCADE;
DROP TYPE IF EXISTS payment_mode CASCADE;
DROP TYPE IF EXISTS payment_type CASCADE;
DROP TYPE IF EXISTS loan_status CASCADE;
DROP TYPE IF EXISTS doc_category CASCADE;

-- Types & Enums
CREATE TYPE user_role AS ENUM (
  'Super Admin', 'Director', 'Accounts', 'Sales', 'CRM', 'Legal', 'Construction', 'Reception', 'Viewer'
);

CREATE TYPE unit_status AS ENUM (
  'Available', 'Booked', 'Blocked', 'Agreement Done', 'Registered', 'Possession Given', 'Cancelled'
);

CREATE TYPE milestone_status AS ENUM (
  'Pending', 'Completed', 'Overdue'
);

CREATE TYPE payment_mode AS ENUM (
  'Cash', 'Cheque', 'UPI', 'NEFT', 'RTGS', 'Bank Loan'
);

CREATE TYPE payment_type AS ENUM (
  'Booking', 'Agreement', 'Slab', 'Brick Work', 'Plaster', 'Flooring', 'Possession', 'Registration', 'Other'
);

CREATE TYPE loan_status AS ENUM (
  'Applied', 'Sanctioned', 'Disbursed', 'Rejected'
);

CREATE TYPE doc_category AS ENUM (
  'PAN', 'Aadhaar', 'Passport Photo', 'Booking Form', 'Agreement', 'Demand Letter', 'Receipt', 'GST Receipt', 'Loan Document', 'Registration', 'Possession Letter', 'Index II', 'Other'
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  mobile_number VARCHAR(15),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  address TEXT,
  tax_id VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  building_name VARCHAR(100),
  address TEXT,
  rera_number VARCHAR(50),
  start_date DATE,
  completion_date DATE,
  total_floors INTEGER DEFAULT 1,
  total_units INTEGER DEFAULT 0,
  construction_status VARCHAR(50) DEFAULT 'Not Started',
  construction_percentage NUMERIC(5,2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Buildings
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  total_floors INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Units
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  unit_number VARCHAR(20) NOT NULL,
  floor INTEGER NOT NULL,
  wing VARCHAR(10),
  carpet_area NUMERIC(10,2) NOT NULL,
  balcony_area NUMERIC(10,2) DEFAULT 0.00,
  built_up_area NUMERIC(10,2),
  saleable_area NUMERIC(10,2) NOT NULL,
  parking VARCHAR(50),
  facing VARCHAR(50),
  status unit_status DEFAULT 'Available',
  
  -- Price details
  basic_price NUMERIC(15,2) NOT NULL,
  gst NUMERIC(15,2) DEFAULT 0.00,
  stamp_duty NUMERIC(15,2) DEFAULT 0.00,
  registration_fee NUMERIC(15,2) DEFAULT 0.00,
  maintenance_charges NUMERIC(15,2) DEFAULT 0.00,
  plc NUMERIC(15,2) DEFAULT 0.00,
  discount NUMERIC(15,2) DEFAULT 0.00,
  final_sale_price NUMERIC(15,2) GENERATED ALWAYS AS (
    basic_price + gst + stamp_duty + registration_fee + maintenance_charges + plc - discount
  ) STORED,
  
  current_construction_stage VARCHAR(100) DEFAULT 'Excavation',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_building_unit UNIQUE(building_id, unit_number)
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID UNIQUE REFERENCES units(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  photo_url TEXT,
  mobile_number VARCHAR(15) NOT NULL,
  alternate_number VARCHAR(15),
  email VARCHAR(100),
  address TEXT,
  pan VARCHAR(10) UNIQUE,
  aadhaar VARCHAR(12) UNIQUE,
  occupation VARCHAR(100),
  company_name VARCHAR(100),
  nominee_name VARCHAR(150),
  sales_executive_id UUID REFERENCES users(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  agreement_date DATE,
  registration_date DATE,
  possession_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Payment Schedules (Milestones)
CREATE TABLE payment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  milestone_name VARCHAR(100) NOT NULL,
  due_percentage NUMERIC(5,2) NOT NULL,
  due_amount NUMERIC(15,2) NOT NULL,
  received_amount NUMERIC(15,2) DEFAULT 0.00,
  outstanding_amount NUMERIC(15,2) GENERATED ALWAYS AS (due_amount - received_amount) STORED,
  due_date DATE NOT NULL,
  status milestone_status DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_type payment_type NOT NULL,
  payment_mode payment_mode NOT NULL,
  transaction_number VARCHAR(100),
  bank_name VARCHAR(100),
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  receipt_url TEXT,
  remarks TEXT,
  entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Bank Loans
CREATE TABLE bank_loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  bank_name VARCHAR(100) NOT NULL,
  executive_name VARCHAR(100),
  loan_amount NUMERIC(15,2) NOT NULL,
  sanction_amount NUMERIC(15,2) DEFAULT 0.00,
  disbursed_amount NUMERIC(15,2) DEFAULT 0.00,
  pending_amount NUMERIC(15,2) GENERATED ALWAYS AS (loan_amount - disbursed_amount) STORED,
  login_date DATE,
  sanction_date DATE,
  disbursement_date DATE,
  status loan_status DEFAULT 'Applied',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  category doc_category NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Construction Stages
CREATE TABLE construction_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage_name VARCHAR(100) NOT NULL,
  start_date DATE,
  completion_date DATE,
  progress_percentage NUMERIC(5,2) DEFAULT 0.00,
  engineer_notes TEXT,
  photos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Demands
CREATE TABLE demands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES payment_schedules(id) ON DELETE CASCADE,
  demand_number VARCHAR(50) UNIQUE NOT NULL,
  raised_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'Unpaid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notes
CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer Timelines
CREATE TABLE customer_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  event_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(45),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Database Indices for fast search
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_units_building ON units(building_id);
CREATE INDEX idx_customers_unit ON customers(unit_id);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payment_schedules_customer ON payment_schedules(customer_id);
CREATE INDEX idx_documents_customer ON documents(customer_id);
CREATE INDEX idx_demands_customer ON demands(customer_id);
CREATE INDEX idx_demands_schedule ON demands(schedule_id);
