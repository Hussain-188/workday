package com.hackathon.workday.invoice;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

	@EntityGraph(attributePaths = {"contract", "manager", "projectManager"})
	Optional<Invoice> findWithDetailsById(Long id);

	/** The manager's own invoices, whatever contract they were raised against. */
	@EntityGraph(attributePaths = {"contract", "manager", "projectManager"})
	Page<Invoice> findByManagerId(Long managerId, Pageable pageable);

	@EntityGraph(attributePaths = {"contract", "manager", "projectManager"})
	Page<Invoice> findByManagerIdAndStatus(Long managerId, InvoiceStatus status, Pageable pageable);

	/** The project manager's approval queue. */
	@EntityGraph(attributePaths = {"contract", "manager", "projectManager"})
	Page<Invoice> findByProjectManagerId(Long projectManagerId, Pageable pageable);

	@EntityGraph(attributePaths = {"contract", "manager", "projectManager"})
	Page<Invoice> findByProjectManagerIdAndStatus(Long projectManagerId, InvoiceStatus status, Pageable pageable);

	/** Organization-wide listing, scoped through the owning manager's organization. */
	@EntityGraph(attributePaths = {"contract", "manager", "projectManager"})
	@Query("SELECT i FROM Invoice i WHERE i.manager.organization.id = :organizationId")
	Page<Invoice> findByOrganizationId(@Param("organizationId") Long organizationId, Pageable pageable);

	@EntityGraph(attributePaths = {"contract", "manager", "projectManager"})
	@Query("SELECT i FROM Invoice i WHERE i.manager.organization.id = :organizationId AND i.status = :status")
	Page<Invoice> findByOrganizationIdAndStatus(
			@Param("organizationId") Long organizationId,
			@Param("status") InvoiceStatus status,
			Pageable pageable);

	long countByProjectManagerIdAndStatus(Long projectManagerId, InvoiceStatus status);

	long countByManagerIdAndStatus(Long managerId, InvoiceStatus status);
}
