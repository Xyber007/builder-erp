-- PostgreSQL database seed data for Builder ERP / Construction MIS

-- 1. Users
INSERT INTO users (id, name, email, password_hash, role, mobile_number) VALUES
('user-id-1', 'Super Admin User', 'admin@shree.com', '$2a$10$X87qXg4a5QyK.d4l9Y6p5.xG74N4cW7V2.5gYV6Z25v/6b2Gq6p2m', 'Super Admin', '9876543210'),
('user-id-2', 'Director User', 'director@shree.com', '$2a$10$X87qXg4a5QyK.d4l9Y6p5.xG74N4cW7V2.5gYV6Z25v/6b2Gq6p2m', 'Director', '9876543211'),
('user-id-3', 'Accounts User', 'accounts@shree.com', '$2a$10$X87qXg4a5QyK.d4l9Y6p5.xG74N4cW7V2.5gYV6Z25v/6b2Gq6p2m', 'Accounts', '9876543212'),
('user-id-4', 'Sales User', 'sales@shree.com', '$2a$10$X87qXg4a5QyK.d4l9Y6p5.xG74N4cW7V2.5gYV6Z25v/6b2Gq6p2m', 'Sales', '9876543213'),
('user-id-5', 'CRM User', 'crm@shree.com', '$2a$10$X87qXg4a5QyK.d4l9Y6p5.xG74N4cW7V2.5gYV6Z25v/6b2Gq6p2m', 'CRM', '9876543214'),
('user-id-6', 'Legal User', 'legal@shree.com', '$2a$10$X87qXg4a5QyK.d4l9Y6p5.xG74N4cW7V2.5gYV6Z25v/6b2Gq6p2m', 'Legal', '9876543215'),
('user-id-7', 'Construction User', 'construction@shree.com', '$2a$10$X87qXg4a5QyK.d4l9Y6p5.xG74N4cW7V2.5gYV6Z25v/6b2Gq6p2m', 'Construction', '9876543216'),
('user-id-8', 'Reception User', 'reception@shree.com', '$2a$10$X87qXg4a5QyK.d4l9Y6p5.xG74N4cW7V2.5gYV6Z25v/6b2Gq6p2m', 'Reception', '9876543217'),
('user-id-9', 'Viewer User', 'viewer@shree.com', '$2a$10$X87qXg4a5QyK.d4l9Y6p5.xG74N4cW7V2.5gYV6Z25v/6b2Gq6p2m', 'Viewer', '9876543218');

-- 2. Companies
INSERT INTO companies (id, name, address, tax_id) VALUES
('company-1', 'Shree Enterprises', '401, Sapphire Chambers, Baner Road, Pune, Maharashtra 411045', 'GSTIN27AAAFS2910M1Z3');

-- 3. Projects
INSERT INTO projects (id, company_id, name, building_name, address, rera_number, start_date, completion_date, total_floors, total_units, construction_status, construction_percentage, notes) VALUES
('project-1', 'company-1', 'Meraki Studio Baner', 'Wing A', 'Sr. No. 45, Veerbhadra Nagar, Baner, Pune, MH - 411045', 'P52100029381', '2025-01-10', '2027-12-31', 9, 45, 'In Progress', 45.00, 'Premium residential 2BHK and 3BHK studio apartments. High appreciation zone near IT corridor.');

-- 4. Buildings
INSERT INTO buildings (id, project_id, name, total_floors) VALUES
('building-1', 'project-1', 'Wing A', 9);

-- 5. Units (Sample selection of units corresponding to generated database layouts)
-- (In a real system, the client script runs these inserts or triggers)
INSERT INTO units (id, building_id, unit_number, floor, wing, carpet_area, balcony_area, built_up_area, saleable_area, parking, facing, status, basic_price, gst, stamp_duty, registration_fee, maintenance_charges, plc, discount, current_construction_stage) VALUES
('unit-id-1', 'building-1', '101', 1, 'A', 750.00, 75.00, 880.00, 1050.00, '1 Open', 'East', 'Possession Given', 6300000.00, 315000.00, 378000.00, 30000.00, 120000.00, 0.00, 0.00, 'Possession'),
('unit-id-2', 'building-1', '102', 1, 'A', 950.00, 95.00, 1120.00, 1350.00, '1 Covered', 'West', 'Possession Given', 8100000.00, 405000.00, 486000.00, 30000.00, 120000.00, 150000.00, 0.00, 'Possession'),
('unit-id-3', 'building-1', '103', 1, 'A', 750.00, 75.00, 880.00, 1050.00, '1 Open', 'North-East', 'Registered', 6300000.00, 315000.00, 378000.00, 30000.00, 120000.00, 0.00, 0.00, 'Brick Work'),
('unit-id-6', 'building-1', '201', 2, 'A', 750.00, 75.00, 880.00, 1050.00, '1 Open', 'East', 'Registered', 6300000.00, 315000.00, 378000.00, 30000.00, 120000.00, 0.00, 0.00, 'Brick Work'),
('unit-id-11', 'building-1', '301', 3, 'A', 750.00, 75.00, 880.00, 1050.00, '1 Open', 'East', 'Agreement Done', 6300000.00, 315000.00, 378000.00, 30000.00, 120000.00, 0.00, 0.00, 'Brick Work'),
('unit-id-12', 'building-1', '302', 3, 'A', 950.00, 95.00, 1120.00, 1350.00, '1 Covered', 'West', 'Registered', 8100000.00, 405000.00, 486000.00, 30000.00, 120000.00, 150000.00, 0.00, 'Brick Work'),
('unit-id-41', 'building-1', '901', 9, 'A', 750.00, 75.00, 880.00, 1050.00, '1 Open', 'East', 'Available', 6300000.00, 315000.00, 378000.00, 30000.00, 120000.00, 0.00, 50000.00, 'Brick Work');

-- 6. Construction Stages
INSERT INTO construction_stages (id, project_id, stage_name, start_date, completion_date, progress_percentage, engineer_notes) VALUES
('stage-id-1', 'project-1', 'Excavation', '2025-01-15', '2025-02-15', 100.00, 'Excavation completed on time. Earth work finished.'),
('stage-id-2', 'project-1', 'Foundation', '2025-02-16', '2025-03-31', 100.00, 'Raft foundation complete, steel binder audit approved.'),
('stage-id-3', 'project-1', 'Basement', '2025-04-01', '2025-05-15', 100.00, 'Retaining walls and basement columns reinforced.'),
('stage-id-4', 'project-1', 'Ground Slab', '2025-05-16', '2025-06-15', 100.00, 'Ground level parking concrete pouring done.'),
('stage-id-5', 'project-1', 'First Slab', '2025-06-16', '2025-07-20', 100.00, 'First slab poured, curing completed.'),
('stage-id-6', 'project-1', 'Second Slab', '2025-07-21', '2025-08-30', 100.00, 'Second slab structural casting completed.'),
('stage-id-7', 'project-1', 'Third Slab', '2025-09-01', '2025-10-15', 100.00, 'Third slab casted successfully.'),
('stage-id-8', 'project-1', 'Brick Work', '2025-10-16', '2026-03-31', 85.00, 'Internal partition brick walls up to 6th floor completed.'),
('stage-id-9', 'project-1', 'Plaster', '2026-04-01', '2026-09-30', 50.00, 'Gypsum plastering on lower floors initiated.'),
('stage-id-10', 'project-1', 'Electrical', '2026-10-01', '2027-02-28', 25.00, 'Wiring conduit pipes running in Wing A.'),
('stage-id-11', 'project-1', 'Flooring', NULL, NULL, 0.00, 'Awaiting plastering completion.'),
('stage-id-12', 'project-1', 'Painting', NULL, NULL, 0.00, 'Not started.'),
('stage-id-13', 'project-1', 'Finishing', NULL, NULL, 0.00, 'Not started.'),
('stage-id-14', 'project-1', 'Possession', NULL, NULL, 0.00, 'Not started.');
