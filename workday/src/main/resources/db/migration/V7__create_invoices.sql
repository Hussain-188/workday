CREATE TABLE invoices (
    id                 BIGINT        NOT NULL AUTO_INCREMENT,
    contract_id        BIGINT        NOT NULL,
    manager_id         BIGINT        NOT NULL,
    project_manager_id BIGINT        NOT NULL,
    period_start       DATE          NOT NULL,
    period_end         DATE          NOT NULL,
    amount             DECIMAL(12, 2) NOT NULL,
    notes              VARCHAR(1000) NULL,
    decision_notes     VARCHAR(1000) NULL,
    status             VARCHAR(20)   NOT NULL,
    created_at         DATETIME(6)   NOT NULL,
    updated_at         DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_invoices_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
    CONSTRAINT fk_invoices_manager FOREIGN KEY (manager_id) REFERENCES users (id),
    CONSTRAINT fk_invoices_project_manager FOREIGN KEY (project_manager_id) REFERENCES users (id),
    CONSTRAINT ck_invoices_amount CHECK (amount >= 0)
) ENGINE = InnoDB;

-- A manager's own invoices, usually filtered by status.
CREATE INDEX idx_invoices_manager_status ON invoices (manager_id, status);
-- A project manager's approval queue, usually filtered to PENDING_APPROVAL.
CREATE INDEX idx_invoices_project_manager_status ON invoices (project_manager_id, status);
CREATE INDEX idx_invoices_contract ON invoices (contract_id);
