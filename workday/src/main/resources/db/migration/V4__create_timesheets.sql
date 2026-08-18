CREATE TABLE timesheets (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    assignment_id   BIGINT        NOT NULL,
    week_start_date DATE          NOT NULL,
    week_end_date   DATE          NOT NULL,
    total_hours     DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    status          VARCHAR(20)   NOT NULL,
    version         BIGINT        NOT NULL DEFAULT 0,
    created_at      DATETIME(6)   NOT NULL,
    updated_at      DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    -- One timesheet per assignment per week, enforced by the database.
    CONSTRAINT uk_timesheets_assignment_week UNIQUE (assignment_id, week_start_date),
    CONSTRAINT fk_timesheets_assignment FOREIGN KEY (assignment_id) REFERENCES assignments (id)
) ENGINE = InnoDB;

CREATE INDEX idx_timesheets_status ON timesheets (status);
CREATE INDEX idx_timesheets_week_start ON timesheets (week_start_date);

CREATE TABLE timesheet_entries (
    id           BIGINT        NOT NULL AUTO_INCREMENT,
    timesheet_id BIGINT        NOT NULL,
    work_date    DATE          NOT NULL,
    hours        DECIMAL(4, 2) NOT NULL,
    notes        VARCHAR(500)  NULL,
    created_at   DATETIME(6)   NOT NULL,
    updated_at   DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_timesheet_entries_date UNIQUE (timesheet_id, work_date),
    -- Entries are part of the timesheet aggregate and have no life of their own.
    CONSTRAINT fk_timesheet_entries_timesheet FOREIGN KEY (timesheet_id)
        REFERENCES timesheets (id) ON DELETE CASCADE,
    CONSTRAINT ck_timesheet_entries_hours CHECK (hours >= 0 AND hours <= 24)
) ENGINE = InnoDB;
