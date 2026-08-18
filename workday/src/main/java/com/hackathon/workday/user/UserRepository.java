package com.hackathon.workday.user;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

	/** Login path: the organization is needed to build the JWT claims. */
	@EntityGraph(attributePaths = "organization")
	Optional<User> findByEmailIgnoreCase(String email);

	boolean existsByEmailIgnoreCase(String email);

	Optional<User> findByIdAndRole(Long id, Role role);

	/** Backs the manager picker; always scoped to the caller's organization. */
	List<User> findByOrganizationIdAndRoleOrderByNameAsc(Long organizationId, Role role);

	List<User> findByOrganizationIdOrderByNameAsc(Long organizationId);
}
