-- T10: schema only. Service authorization and cross-row rules remain in their API tasks.
-- T03 V1/V2 are immutable. See docs/data-model.md and backend/T10_MIGRATION.md.

CREATE TABLE sockets (
    socket_code VARCHAR(32) PRIMARY KEY CHECK (socket_code = btrim(socket_code) AND socket_code <> ''),
    name VARCHAR(255) NOT NULL CHECK (name = btrim(name) AND name <> '')
);
CREATE TABLE form_factors (
    form_factor_code VARCHAR(32) PRIMARY KEY CHECK (form_factor_code = btrim(form_factor_code) AND form_factor_code <> ''),
    name VARCHAR(255) NOT NULL CHECK (name = btrim(name) AND name <> '')
);

-- Each spec has a shared product PK/FK. Category/type consistency is checked by Service.
CREATE TABLE cpu_specs (
    product_id INTEGER PRIMARY KEY REFERENCES products ON DELETE CASCADE ON UPDATE RESTRICT,
    socket_code VARCHAR(32) NOT NULL REFERENCES sockets ON DELETE RESTRICT ON UPDATE RESTRICT,
    cores INTEGER NOT NULL CHECK (cores > 0),
    threads INTEGER NOT NULL CHECK (threads >= cores),
    base_clock_ghz DOUBLE PRECISION NOT NULL CHECK (base_clock_ghz > 0 AND base_clock_ghz < 'Infinity'::double precision),
    boost_clock_ghz DOUBLE PRECISION NOT NULL CHECK (boost_clock_ghz >= base_clock_ghz AND boost_clock_ghz < 'Infinity'::double precision),
    tdp_watts INTEGER NOT NULL CHECK (tdp_watts >= 0)
);
CREATE INDEX ix_cpu_specs_socket ON cpu_specs(socket_code);
CREATE TABLE motherboard_specs (
    product_id INTEGER PRIMARY KEY REFERENCES products ON DELETE CASCADE ON UPDATE RESTRICT,
    socket_code VARCHAR(32) NOT NULL REFERENCES sockets ON DELETE RESTRICT ON UPDATE RESTRICT,
    chipset VARCHAR(255) NOT NULL CHECK (chipset = btrim(chipset) AND chipset <> ''),
    ram_type VARCHAR(255) NOT NULL CHECK (ram_type = btrim(ram_type) AND ram_type <> ''),
    pcie_version VARCHAR(255) NOT NULL CHECK (pcie_version = btrim(pcie_version) AND pcie_version <> ''),
    form_factor_code VARCHAR(32) NOT NULL REFERENCES form_factors ON DELETE RESTRICT ON UPDATE RESTRICT,
    ram_slots INTEGER NOT NULL CHECK (ram_slots > 0),
    max_ram_gb INTEGER NOT NULL CHECK (max_ram_gb > 0)
);
CREATE INDEX ix_motherboard_specs_socket ON motherboard_specs(socket_code);
CREATE INDEX ix_motherboard_specs_form_factor ON motherboard_specs(form_factor_code);
CREATE TABLE ram_specs (
    product_id INTEGER PRIMARY KEY REFERENCES products ON DELETE CASCADE ON UPDATE RESTRICT,
    ram_type VARCHAR(255) NOT NULL CHECK (ram_type = btrim(ram_type) AND ram_type <> ''),
    capacity_gb INTEGER NOT NULL CHECK (capacity_gb > 0),
    speed_mhz INTEGER NOT NULL CHECK (speed_mhz > 0),
    module_count INTEGER NOT NULL CHECK (module_count >= 1)
);
CREATE TABLE gpu_specs (
    product_id INTEGER PRIMARY KEY REFERENCES products ON DELETE CASCADE ON UPDATE RESTRICT,
    vram_gb INTEGER NOT NULL CHECK (vram_gb > 0),
    memory_type VARCHAR(255) NOT NULL CHECK (memory_type = btrim(memory_type) AND memory_type <> ''),
    interface_type VARCHAR(255) NOT NULL CHECK (interface_type = btrim(interface_type) AND interface_type <> ''),
    length_mm INTEGER NOT NULL CHECK (length_mm > 0),
    power_consumption_w INTEGER NOT NULL CHECK (power_consumption_w >= 0),
    recommended_psu_w INTEGER NOT NULL CHECK (recommended_psu_w > 0)
);
CREATE TABLE storage_specs (
    product_id INTEGER PRIMARY KEY REFERENCES products ON DELETE CASCADE ON UPDATE RESTRICT,
    storage_type VARCHAR(255) NOT NULL CHECK (storage_type = btrim(storage_type) AND storage_type <> ''),
    interface_type VARCHAR(255) NOT NULL CHECK (interface_type = btrim(interface_type) AND interface_type <> ''),
    capacity_gb INTEGER NOT NULL CHECK (capacity_gb > 0),
    read_speed_mbps INTEGER NOT NULL CHECK (read_speed_mbps >= 0),
    write_speed_mbps INTEGER NOT NULL CHECK (write_speed_mbps >= 0)
);
CREATE TABLE psu_specs (
    product_id INTEGER PRIMARY KEY REFERENCES products ON DELETE CASCADE ON UPDATE RESTRICT,
    wattage INTEGER NOT NULL CHECK (wattage > 0),
    efficiency_rating VARCHAR(255) NOT NULL CHECK (efficiency_rating = btrim(efficiency_rating) AND efficiency_rating <> ''),
    modular_type VARCHAR(255) NOT NULL CHECK (modular_type = btrim(modular_type) AND modular_type <> '')
);
CREATE TABLE case_specs (
    product_id INTEGER PRIMARY KEY REFERENCES products ON DELETE CASCADE ON UPDATE RESTRICT,
    max_gpu_length_mm INTEGER NOT NULL CHECK (max_gpu_length_mm > 0),
    max_cooler_height_mm INTEGER NOT NULL CHECK (max_cooler_height_mm > 0),
    max_radiator_size_mm INTEGER NOT NULL CHECK (max_radiator_size_mm >= 0)
);
CREATE TABLE cooler_specs (
    product_id INTEGER PRIMARY KEY REFERENCES products ON DELETE CASCADE ON UPDATE RESTRICT,
    cooler_type VARCHAR(255) NOT NULL CHECK (cooler_type = btrim(cooler_type) AND cooler_type <> ''),
    max_tdp_w INTEGER NOT NULL CHECK (max_tdp_w > 0),
    height_mm INTEGER CHECK (height_mm > 0),
    radiator_size_mm INTEGER CHECK (radiator_size_mm > 0)
);
CREATE TABLE case_supported_form_factors (
    case_product_id INTEGER NOT NULL REFERENCES case_specs(product_id) ON DELETE CASCADE ON UPDATE RESTRICT,
    form_factor_code VARCHAR(32) NOT NULL REFERENCES form_factors ON DELETE RESTRICT ON UPDATE RESTRICT,
    PRIMARY KEY (case_product_id, form_factor_code)
);
CREATE INDEX ix_case_supported_form_factors_form ON case_supported_form_factors(form_factor_code);
CREATE TABLE cooler_supported_sockets (
    cooler_product_id INTEGER NOT NULL REFERENCES cooler_specs(product_id) ON DELETE CASCADE ON UPDATE RESTRICT,
    socket_code VARCHAR(32) NOT NULL REFERENCES sockets ON DELETE RESTRICT ON UPDATE RESTRICT,
    PRIMARY KEY (cooler_product_id, socket_code)
);
CREATE INDEX ix_cooler_supported_sockets_socket ON cooler_supported_sockets(socket_code);

CREATE TABLE pc_builds (
    build_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE RESTRICT ON UPDATE RESTRICT,
    name VARCHAR(255) NOT NULL CHECK (name = btrim(name) AND name <> ''),
    source_type VARCHAR(32) NOT NULL CHECK (source_type IN ('MANUAL','RECOMMENDATION'))
);
CREATE INDEX ix_pc_builds_user ON pc_builds(user_id);
CREATE TABLE pc_build_items (
    build_item_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    build_id INTEGER NOT NULL REFERENCES pc_builds ON DELETE CASCADE ON UPDATE RESTRICT,
    product_id INTEGER NOT NULL REFERENCES products ON DELETE RESTRICT ON UPDATE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    UNIQUE (build_id, product_id)
);
CREATE INDEX ix_pc_build_items_product ON pc_build_items(product_id);

-- Author/product come from OrderItem -> Order/User and OrderItem -> Product.
-- Do not duplicate author_id/product_id: they could disagree with the purchased line.
CREATE TABLE product_reviews (
    review_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_item_id INTEGER NOT NULL UNIQUE REFERENCES order_items ON DELETE RESTRICT ON UPDATE RESTRICT,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content TEXT NOT NULL CHECK (content = btrim(content) AND content <> ''),
    status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED','HIDDEN','DELETED')),
    moderation_reason TEXT CHECK (moderation_reason IS NULL OR (moderation_reason = btrim(moderation_reason) AND moderation_reason <> '')),
    moderated_by INTEGER REFERENCES users ON DELETE RESTRICT ON UPDATE RESTRICT,
    moderated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT ck_product_reviews_moderator CHECK ((moderated_by IS NULL) = (moderated_at IS NULL)),
    CONSTRAINT ck_product_reviews_hidden CHECK (status <> 'HIDDEN' OR
        (moderation_reason IS NOT NULL AND moderated_by IS NOT NULL AND moderated_at IS NOT NULL))
);
CREATE INDEX ix_product_reviews_status ON product_reviews(status);
CREATE INDEX ix_product_reviews_moderator ON product_reviews(moderated_by);
CREATE TABLE review_media (
    media_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES product_reviews ON DELETE CASCADE ON UPDATE RESTRICT,
    media_type VARCHAR(32) NOT NULL CHECK (media_type IN ('IMAGE','VIDEO')),
    storage_key VARCHAR(2048) NOT NULL UNIQUE CHECK (storage_key = btrim(storage_key) AND storage_key <> ''),
    mime_type VARCHAR(255) NOT NULL CHECK (mime_type = btrim(mime_type) AND mime_type <> ''),
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    duration_second INTEGER,
    sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
    UNIQUE (review_id, sort_order),
    CONSTRAINT ck_review_media_duration CHECK ((media_type = 'IMAGE' AND duration_second IS NULL) OR
        (media_type = 'VIDEO' AND duration_second IS NOT NULL AND duration_second > 0))
);
CREATE TABLE review_likes (
    review_id INTEGER NOT NULL REFERENCES product_reviews ON DELETE CASCADE ON UPDATE RESTRICT,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE RESTRICT ON UPDATE RESTRICT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (review_id, user_id)
);
CREATE INDEX ix_review_likes_user ON review_likes(user_id);

CREATE TABLE setup_posts (
    post_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE RESTRICT ON UPDATE RESTRICT,
    title VARCHAR(255) NOT NULL CHECK (title = btrim(title) AND title <> ''),
    description TEXT NOT NULL CHECK (description = btrim(description) AND description <> ''),
    status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED','HIDDEN')),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    moderation_reason TEXT CHECK (moderation_reason IS NULL OR (moderation_reason = btrim(moderation_reason) AND moderation_reason <> '')),
    moderated_by INTEGER REFERENCES users ON DELETE RESTRICT ON UPDATE RESTRICT,
    moderated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT ck_setup_posts_moderator CHECK ((moderated_by IS NULL) = (moderated_at IS NULL)),
    CONSTRAINT ck_setup_posts_hidden CHECK (status <> 'HIDDEN' OR
        (moderation_reason IS NOT NULL AND moderated_by IS NOT NULL AND moderated_at IS NOT NULL))
);
CREATE INDEX ix_setup_posts_user ON setup_posts(user_id);
CREATE INDEX ix_setup_posts_status_created ON setup_posts(status, created_at, post_id);
CREATE INDEX ix_setup_posts_moderator ON setup_posts(moderated_by);
CREATE TABLE setup_images (
    image_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES setup_posts ON DELETE CASCADE ON UPDATE RESTRICT,
    image_url VARCHAR(2048) NOT NULL CHECK (image_url = btrim(image_url) AND image_url <> ''),
    sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
    UNIQUE (post_id, sort_order)
);
CREATE TABLE setup_post_products (
    post_id INTEGER NOT NULL REFERENCES setup_posts ON DELETE CASCADE ON UPDATE RESTRICT,
    product_id INTEGER NOT NULL REFERENCES products ON DELETE RESTRICT ON UPDATE RESTRICT,
    PRIMARY KEY (post_id, product_id)
);
CREATE INDEX ix_setup_post_products_product ON setup_post_products(product_id);
CREATE TABLE setup_likes (
    post_id INTEGER NOT NULL REFERENCES setup_posts ON DELETE CASCADE ON UPDATE RESTRICT,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE RESTRICT ON UPDATE RESTRICT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (post_id, user_id)
);
CREATE INDEX ix_setup_likes_user ON setup_likes(user_id);
