package com.pcstore.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pc_builds")
public class PcBuild {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "build_id")
    private Integer buildId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "source_type", nullable = false, length = 32)
    private String sourceType = "MANUAL";

    @OneToMany(mappedBy = "build", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("buildItemId ASC")
    private List<PcBuildItem> items = new ArrayList<>();

    public Integer getBuildId() { return buildId; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }
    public List<PcBuildItem> getItems() { return items; }
}
