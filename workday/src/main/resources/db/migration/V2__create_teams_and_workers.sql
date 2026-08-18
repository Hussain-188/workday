CREATE TABLE teams (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    organization_id BIGINT       NOT NULL,
    name            VARCHAR(150) NOT NULL,
    code            VARCHAR(50)  NOT NULL,
    description     VARCHAR(500) NULL,
    manager_id      BIGINT       NOT NULL,
    status          VARCHAR(20)  NOT NULL,
    created_at      DATETIME(6)  NOT NULL,
    updated_at      DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_teams_organization_code UNIQUE (organization_id, code),
    CONSTRAINT fk_teams_organization FOREIGN KEY (organization_id) REFERENCES organizations (id),
    CONSTRAINT fk_teams_manager FOREIGN KEY (manager_id) REFERENCES users (id)
) ENGINE = InnoDB;

-- uk_teams_organization_code covers organization_id lookups via leftmost prefix.
CREATE INDEX idx_teams_manager ON teams (manager_id);
CREATE INDEX idx_teams_status ON teams (status);

CREATE TABLE workers (
    id                    BIGINT      NOT NULL AUTO_INCREMENT,
    user_id               BIGINT      NOT NULL,
    organization_id       BIGINT      NOT NULL,
    team_id               BIGINT      NULL,
    employee_code         VARCHAR(50) NOT NULL,
    worker_type           VARCHAR(30) NOT NULL,
    employment_start_date DATE        NOT NULL,
    employment_end_date   DATE        NULL,
    status                VARCHAR(20) NOT NULL,
    created_at            DATETIME(6) NOT NULL,
    updated_at            DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_workers_user UNIQUE (user_id),
    CONSTRAINT uk_workers_employee_code UNIQUE (employee_code),
    CONSTRAINT fk_workers_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_workers_organization FOREIGN KEY (organization_id) REFERENCES organizations (id),
    CONSTRAINT fk_workers_team FOREIGN KEY (team_id) REFERENCES teams (id)
) ENGINE = InnoDB;

-- HR listings scope by organization and filter by lifecycle status.
CREATE INDEX idx_workers_organization_status ON workers (organization_id, status);
-- Manager listings resolve workers through their team.
CREATE INDEX idx_workers_team_status ON workers (team_id, status);
