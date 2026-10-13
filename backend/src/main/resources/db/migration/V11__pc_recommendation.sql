CREATE TABLE recommendation_requests (
    request_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    status VARCHAR(32) NOT NULL CHECK (status IN ('QUEUED','PROCESSING','SUCCEEDED','FAILED')),
    purpose_notes TEXT,
    software_text TEXT NOT NULL CHECK (btrim(software_text) <> ''),
    games_text TEXT,
    target_resolution VARCHAR(100),
    target_fps INTEGER CHECK (target_fps > 0),
    pc_budget NUMERIC(19,0) NOT NULL CHECK (pc_budget > 0),
    min_storage_gb INTEGER NOT NULL CHECK (min_storage_gb >= 0),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);
CREATE INDEX ix_recommendation_requests_user ON recommendation_requests(user_id, status);
CREATE UNIQUE INDEX ux_recommendation_active_user ON recommendation_requests(user_id)
    WHERE status IN ('QUEUED','PROCESSING');
CREATE TABLE recommendation_request_purposes (
    request_id INTEGER NOT NULL REFERENCES recommendation_requests(request_id) ON DELETE CASCADE,
    purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('OFFICE_STUDY','PROGRAMMING','GAMING','STREAMING','VIDEO_EDITING','DESIGN_2D_3D','AI_ML','ARCHITECTURE_RENDER','OTHER')),
    PRIMARY KEY(request_id,purpose)
);
CREATE TABLE recommendation_attempts (
    attempt_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES recommendation_requests(request_id),
    attempt_no INTEGER NOT NULL CHECK (attempt_no > 0),
    status VARCHAR(32) NOT NULL CHECK (status IN ('RUNNING','REJECTED','ERROR','ACCEPTED')),
    failure_code VARCHAR(64), failure_reason TEXT,
    criteria_json TEXT,
    started_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITHOUT TIME ZONE,
    UNIQUE(request_id,attempt_no),
    CHECK ((status = 'RUNNING' AND finished_at IS NULL) OR (status <> 'RUNNING' AND finished_at IS NOT NULL)),
    CHECK (finished_at >= started_at),
    CHECK (status NOT IN ('REJECTED','ERROR') OR (failure_code IS NOT NULL AND btrim(failure_reason) <> '' AND failure_reason IS NOT NULL))
);
CREATE UNIQUE INDEX ux_recommendation_running ON recommendation_attempts(request_id) WHERE status = 'RUNNING';
CREATE UNIQUE INDEX ux_recommendation_accepted ON recommendation_attempts(request_id) WHERE status = 'ACCEPTED';
CREATE TABLE recommendation_results (
    result_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    attempt_id INTEGER NOT NULL UNIQUE REFERENCES recommendation_attempts(attempt_id),
    build_id INTEGER NOT NULL UNIQUE REFERENCES pc_builds(build_id),
    estimated_total NUMERIC(19,0) NOT NULL CHECK (estimated_total >= 0),
    reason TEXT NOT NULL,
    matched_level VARCHAR(16) NOT NULL CHECK (matched_level IN ('PREFERRED','MINIMUM')),
    search_limited BOOLEAN NOT NULL,
    visited_nodes BIGINT NOT NULL CHECK (visited_nodes >= 0)
);
