package com.hackathon.workday.common.audit;

import org.springframework.stereotype.Service;

/**
 * Deliberately small. Audit writes join the caller's transaction, so an
 * operation that rolls back leaves no misleading audit trail behind.
 */
@Service
public class AuditService {

	private final AuditLogRepository auditLogRepository;

	public AuditService(AuditLogRepository auditLogRepository) {
		this.auditLogRepository = auditLogRepository;
	}

	public void record(Long actorUserId, AuditAction action, String entityType, Long entityId, String details) {
		auditLogRepository.save(new AuditLog(actorUserId, action, entityType, entityId, details));
	}

	public void record(Long actorUserId, AuditAction action, String entityType, Long entityId) {
		record(actorUserId, action, entityType, entityId, null);
	}
}
