-- Reserve the Cloudinary endpoint before upload; failed video uploads still need video/destroy.
ALTER TABLE media_assets ADD COLUMN resource_type VARCHAR(8) NOT NULL DEFAULT 'image';
UPDATE media_assets SET resource_type = 'video' WHERE mime_type = 'video/mp4';
ALTER TABLE media_assets ADD CONSTRAINT ck_media_resource_type CHECK (
    resource_type IN ('image', 'video') AND
    (resource_type <> 'video' OR module = 'REVIEW') AND
    (mime_type IS NULL OR
     (resource_type = 'image' AND mime_type = 'image/jpeg') OR
     (resource_type = 'video' AND mime_type = 'video/mp4'))
);
