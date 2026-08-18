package com.hackathon.workday.common.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * An append-only record of who did what to which entity. Deliberately flat and
 * denormalised: it stores ids rather than associations so that it never affects
 * the lifecycle of the entities it describes.
 */
@Entity
@Table(name = "audit_logs")
public class AuditLog {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "actor_user_id", nullable = false)
	private Long actorUserId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 50)
	private AuditAction action;

	@Column(name = "entity_type", nullable = false, length = 50)
	private String entityType;

	@Column(name = "entity_id", nullable = false)
	private Long entityId;

	@Column(length = 500)
	private String details;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	protected AuditLog() {
		// for JPA
	}

	public AuditLog(Long actorUserId, AuditAction action, String entityType, Long entityId, String details) {
		this.actorUserId = actorUserId;
		this.action = action;
		this.entityType = entityType;
		this.entityId = entityId;
		this.details = details;
		this.createdAt = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public Long getActorUserId() {
		return actorUserId;
	}

	public AuditAction getAction() {
		return action;
	}

	public String getEntityType() {
		return entityType;
	}

	public Long getEntityId() {
		return entityId;
	}

	public String getDetails() {
		return details;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
