-- T21: durable reservation before Cloudinary upload. V3 remains unchanged.
CREATE TABLE media_assets (
    media_id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE RESTRICT ON UPDATE RESTRICT,
    module VARCHAR(16) NOT NULL CHECK (module IN ('SETUP', 'REVIEW')),
    status VARCHAR(16) NOT NULL CHECK (status IN ('UPLOADING', 'TEMP', 'ATTACHED', 'DELETE_PENDING')),
    public_id VARCHAR(255) NOT NULL UNIQUE,
    cloudinary_asset_id VARCHAR(255) UNIQUE,
    mime_type VARCHAR(64),
    size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes > 0),
    width INTEGER CHECK (width IS NULL OR width > 0),
    height INTEGER CHECK (height IS NULL OR height > 0),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    attached_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT ck_media_temp_public_id CHECK (
        (module = 'SETUP' AND public_id LIKE 'pcstore/temp/setup/%') OR
        (module = 'REVIEW' AND public_id LIKE 'pcstore/temp/review/%')),
    CONSTRAINT ck_media_details CHECK (
        status IN ('UPLOADING', 'DELETE_PENDING') OR
        (cloudinary_asset_id IS NOT NULL AND mime_type = 'image/jpeg'
         AND size_bytes IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL)),
    CONSTRAINT ck_media_attached_at CHECK (
        (status = 'ATTACHED' AND attached_at IS NOT NULL) OR
        (status <> 'ATTACHED' AND attached_at IS NULL))
);
CREATE INDEX ix_media_assets_user_created ON media_assets(user_id, created_at);
CREATE INDEX ix_media_assets_expiry ON media_assets(status, expires_at);

-- Existing V3 rows remain readable; new module services must set media_asset_id.
ALTER TABLE setup_images ADD COLUMN media_asset_id UUID UNIQUE
    REFERENCES media_assets(media_id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE review_media ADD COLUMN media_asset_id UUID UNIQUE
    REFERENCES media_assets(media_id) ON DELETE RESTRICT ON UPDATE RESTRICT;
