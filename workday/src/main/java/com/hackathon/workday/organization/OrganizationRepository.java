package com.hackathon.workday.organization;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {

	Optional<Organization> findByCode(String code);

	boolean existsByCode(String code);
}
