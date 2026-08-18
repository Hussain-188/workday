CREATE TABLE assignments (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    team_id     BIGINT        NOT NULL,
    worker_id   BIGINT        NOT NULL,
    manager_id  BIGINT        NOT NULL,
    title       VARCHAR(200)  NOT NULL,
    description VARCHAR(2000) NULL,
    start_date  DATE          NOT NULL,
    end_date    DATE          NULL,
    status      VARCHAR(20)   NOT NULL,
    created_at  DATETIME(6)   NOT NULL,
    updated_at  DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_assignments_team FOREIGN KEY (team_id) REFERENCES teams (id),
    CONSTRAINT fk_assignments_worker FOREIGN KEY (worker_id) REFERENCES workers (id),
    CONSTRAINT fk_assignments_manager FOREIGN KEY (manager_id) REFERENCES users (id)
) ENGINE = InnoDB;

-- Workers list their own assignments, usually filtered to ACTIVE.
CREATE INDEX idx_assignments_worker_status ON assignments (worker_id, status);
-- Managers list assignments per team, usually filtered by status.
CREATE INDEX idx_assignments_team_status ON assignments (team_id, status);
CREATE INDEX idx_assignments_manager ON assignments (manager_id);
