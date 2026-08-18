package com.hackathon.workday;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Proves the whole context wires up: every bean resolves, Flyway migrates, and
 * Hibernate validates its mappings against the migrated schema.
 */
@SpringBootTest
@ActiveProfiles("test")
class WorkdayApplicationTests {

	@Test
	void contextLoads() {
	}

}
