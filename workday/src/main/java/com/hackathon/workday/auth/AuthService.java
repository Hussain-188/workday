package com.hackathon.workday.auth;

import com.hackathon.workday.auth.dto.LoginRequest;
import com.hackathon.workday.auth.dto.LoginResponse;
import com.hackathon.workday.common.exception.ForbiddenOperationException;
import com.hackathon.workday.security.jwt.JwtService;
import com.hackathon.workday.user.Role;
import com.hackathon.workday.user.User;
import com.hackathon.workday.user.UserRepository;
import com.hackathon.workday.worker.Worker;
import com.hackathon.workday.worker.WorkerRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

	private final UserRepository userRepository;
	private final WorkerRepository workerRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;

	public AuthService(UserRepository userRepository, WorkerRepository workerRepository,
			PasswordEncoder passwordEncoder, JwtService jwtService) {
		this.userRepository = userRepository;
		this.workerRepository = workerRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
	}

	@Transactional(readOnly = true)
	public LoginResponse login(LoginRequest request) {
		User user = userRepository.findByEmailIgnoreCase(request.email())
				.orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

		// Compared against the BCrypt hash; the raw password is never stored or logged.
		if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
			throw new BadCredentialsException("Invalid email or password");
		}

		if (!user.isActive()) {
			throw new ForbiddenOperationException("This account is inactive");
		}

		// A WORKER's employment record id is handy for the client, but it is
		// never accepted back as an input: ownership is always re-derived here.
		Long workerId = null;
		if (user.getRole() == Role.WORKER) {
			workerId = workerRepository.findByUserId(user.getId())
					.map(Worker::getId)
					.orElse(null);
		}

		return new LoginResponse(
				jwtService.generateToken(user),
				"Bearer",
				jwtService.getExpirationSeconds(),
				user.getId(),
				user.getName(),
				user.getEmail(),
				user.getRole(),
				user.getOrganization().getId(),
				user.getOrganization().getName(),
				workerId);
	}
}
