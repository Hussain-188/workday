package com.hackathon.workday.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/** Enables the {@code @CreatedDate}/{@code @LastModifiedDate} stamps on BaseEntity. */
@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
