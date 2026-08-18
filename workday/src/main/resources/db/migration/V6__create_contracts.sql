CREATE TABLE contracts (
    id                  BIGINT       NOT NULL AUTO_INCREMENT,
    project_name        VARCHAR(200) NOT NULL,
    start_time          DATE         NOT NULL,
    duration_in_months  INT          NOT NULL,
    manager_id          BIGINT       NOT NULL,
    created_by_admin_id BIGINT       NOT NULL,
    created_at          DATETIME(6)  NOT NULL,
    updated_at          DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_contracts_manager FOREIGN KEY (manager_id) REFERENCES users (id),
    CONSTRAINT fk_contracts_created_by_admin FOREIGN KEY (created_by_admin_id) REFERENCES users (id),
    CONSTRAINT ck_contracts_duration CHECK (duration_in_months > 0)
) ENGINE = InnoDB;

-- A manager's own contracts, listed most often by status of the surrounding org.
CREATE INDEX idx_contracts_manager ON contracts (manager_id);
CREATE INDEX idx_contracts_created_by_admin ON contracts (created_by_admin_id);
